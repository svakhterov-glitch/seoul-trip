'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { getTrip, updateTrip } from '@/lib/trips';
import {
  type TripDoc, type Coords, type PlaceInput,
  ensureTripDefaults, addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip, updateTripMeta,
  updateDay, reorderDays, movableDayNumbers, addCategory, movePlace, addInboxLink, removeInboxLink, updateInboxLink, addPlaceFromInbox, addInboxPlace,
  applyItinerary, setFlights, setHotels, clearItinerary, togglePlaceLock, placesForDay, getCategory,
  addChecklistItem, toggleChecklistItem, removeChecklistItem, optimizeDayOrder, type Flight, type Hotel, type Place,
  addShoppingItem, toggleShoppingItem, removeShoppingItem,
} from '@/lib/entities';
import {
  listSuggestions, markSuggestion, updateSuggestion, setSuggestionTag, telegramLinkStatus, ensureTelegramLink,
  type TgSuggestion, type TgLinkStatus,
} from '@/lib/telegramInbox';
import { resolveLink } from '@/lib/resolveLink';
import { isLink } from '@/lib/parseLink';
import { searchPlaces, placeMapsUrl, type PlaceCandidate } from '@/lib/searchPlaces';
import { isMapLink } from '@/lib/mapLinks';
import { generateItinerary, type ItineraryPace } from '@/lib/generateItinerary';
import { suggestChecklist } from '@/lib/suggestChecklist';
import { geocodeQueries, cityCenter, inRegion } from '@/lib/geocode';
import { describePlaces } from '@/lib/describePlaces';
import { fetchMediaBoard, fetchMoreMedia } from '@/lib/mediaBoard';
import { type MediaItem } from '@/lib/media';
import { formatDateRange, daysBetween } from '@/lib/days';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { AiItinerary } from '@/components/planner/AiItinerary';
import { TripSettings } from '@/components/planner/TripSettings';
import { TripCover, type TripCoverSave } from '@/components/planner/TripCover';
import { DayTabs, MEDIA_TAB, INBOX_TAB } from '@/components/planner/DayTabs';
import { Inbox, type SearchState } from '@/components/planner/Inbox';
import { Timeline } from '@/components/planner/Timeline';
import { DayReorder } from '@/components/planner/DayReorder';
import { MediaBoard } from '@/components/planner/MediaBoard';
import { SuggestionBoard } from '@/components/planner/SuggestionBoard';
import { ShoppingList } from '@/components/planner/ShoppingList';
import { type DaySave } from '@/components/planner/DayForm';
import { PlaceForm } from '@/components/planner/PlaceForm';
import styles from './page.module.css';

const TripMap = dynamic(() => import('@/components/planner/TripMap').then((m) => m.TripMap), { ssr: false });

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; dayNumber: number }
  | { mode: 'edit'; id: string }
  | { mode: 'fromInbox'; linkId: string; dayNumber: number };

/** Выполнить задачи с ограничением параллельности (чтобы не залить сеть/лимиты). */
async function runPooled<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

/** Тема дня для ИИ: тег (категория) + заголовок + подпись, через « — ». '' если пусто. */
function dayTheme(trip: TripDoc, dayNumber: number): string {
  const d = trip.days.find((x) => x.number === dayNumber);
  if (!d) return '';
  const cat = getCategory(trip, d.cat)?.label || '';
  return [cat, d.title, d.sub].map((s) => (s || '').trim()).filter(Boolean).join(' — ');
}

function PlannerInner() {
  const router = useRouter();
  const session = useSession();
  const params = useSearchParams();
  const id = params.get('id') ?? '';

  const [trip, setTrip] = useState<TripDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [draftCoords, setDraftCoords] = useState<Coords | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  // id ссылок, которые сейчас разбираются на сервере (показываем «разбираю…»)
  const [resolving, setResolving] = useState<string[]>([]);
  // активный поиск места по названию (панель выбора кандидатов в инбоксе)
  const [search, setSearch] = useState<SearchState | null>(null);
  // идёт сборка ИИ-маршрута на сервере (несколько минут)
  const [generating, setGenerating] = useState(false);
  // открыта модалка настроек поездки (перелёт/отели/очистка)
  const [settingsOpen, setSettingsOpen] = useState(false);
  // открыта модалка «Порядок дней» (drag-and-drop перестановка дней)
  const [reorderOpen, setReorderOpen] = useState(false);
  // номер дня, для которого ИИ сейчас добирает места (null — нет)
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  // id отеля, точку которого ставим кликом по карте (null — не ставим)
  const [pickHotel, setPickHotel] = useState<string | null>(null);
  // доска «Медиа»: подборка трендовых мест (null — ещё не загружали), подсветка метки
  const [mediaItems, setMediaItems] = useState<MediaItem[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaRefreshing, setMediaRefreshing] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Telegram-предложка: входящие из чата (null — ещё не загружали), статус привязки
  const [suggestions, setSuggestions] = useState<TgSuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [tgLink, setTgLink] = useState<TgLinkStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  // идёт разбор ссылок предложки (фото/описание/координаты)
  const [processingSug, setProcessingSug] = useState(false);
  const autoProcessedRef = useRef(false); // авто-разбор предложки — один раз за открытие
  // ID предложений, уже прошедших разбор: после попытки не считаем их «требующими
  // работы» снова — иначе неназываемое место/ссылка без фото держит счётчик навсегда
  // и кнопка «Обработать» выглядит сломанной (клик → та же неудача → «ничего»).
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  // слои на карте «Весь маршрут»: наложить метки Медиа / Предложки поверх маршрута
  const [layerMedia, setLayerMedia] = useState(false);
  const [layerSug, setLayerSug] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  // Свежий документ для патча после async-разбора (state мог уйти вперёд).
  const tripRef = useRef<TripDoc | null>(null);

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed' || !id) return;
    getTrip(getSupabase(), id).then(async (t) => {
      if (!t) { setNotFound(true); return; }
      const fixed = ensureTripDefaults(t);
      if (fixed !== t) await updateTrip(getSupabase(), fixed);
      setTrip(fixed);
      tripRef.current = fixed;
    }).catch(() => setNotFound(true));
  }, [session.status, id, router]);

  // в режиме выбора точки — подвести карту в зону видимости
  useEffect(() => {
    if (picking && mapRef.current) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      mapRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    }
  }, [picking]);

  // доска «Медиа» — лениво: при открытии её вкладки ИЛИ при включении слоя на маршруте
  useEffect(() => {
    const need = activeDay === MEDIA_TAB || (activeDay >= 0 && layerMedia);
    if (!need || !trip || mediaItems !== null || mediaLoading) return;
    setMediaLoading(true);
    fetchMediaBoard(trip.city, trip.country)
      .then((list) => setMediaItems(list))
      .finally(() => setMediaLoading(false));
  }, [activeDay, layerMedia, trip, mediaItems, mediaLoading]);

  // «Предложка» (Telegram) — лениво: при открытии её вкладки ИЛИ при включении слоя
  useEffect(() => {
    const need = activeDay === INBOX_TAB || (activeDay >= 0 && layerSug);
    if (!need || !trip || suggestions !== null || suggestLoading) return;
    setSuggestLoading(true);
    Promise.all([listSuggestions(trip.id), telegramLinkStatus(trip.id)])
      .then(([list, link]) => { setSuggestions(list); setTgLink(link); })
      .finally(() => setSuggestLoading(false));
  }, [activeDay, layerSug, trip, suggestions, suggestLoading]);

  // Авто-разбор предложки (фото/координаты) — один раз: при открытии её вкладки
  // ИЛИ при включении слоя «Предложка» на маршруте (иначе метки без точки не видны).
  useEffect(() => {
    const active = activeDay === INBOX_TAB || (activeDay >= 0 && layerSug);
    if (!active || !suggestions || autoProcessedRef.current) return;
    if (rawSuggestionCount(suggestions) === 0) return;
    autoProcessedRef.current = true;
    handleProcessSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay, layerSug, suggestions]);

  // низкоуровневое сохранение документа без закрытия форм
  async function save(next: TripDoc): Promise<boolean> {
    setBusy(true);
    try {
      await updateTrip(getSupabase(), next);
      setTrip(next);
      tripRef.current = next;
      return true;
    } catch {
      alert('Не удалось сохранить. Попробуйте ещё раз.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(input: PlaceInput) {
    if (!trip) return;
    const next = form.mode === 'add'
      ? addPlaceToTrip(trip, form.dayNumber, input)
      : form.mode === 'edit'
        ? updatePlaceInTrip(trip, form.id, { ...input })
        : form.mode === 'fromInbox'
          ? addPlaceFromInbox(trip, form.linkId, form.dayNumber, input)
          : trip;
    if (await save(next)) closeForm();
  }

  // Единый ввод инбокса: ссылка → разбор как раньше; текст → поиск места по названию.
  async function handleAdd(textInput: string) {
    if (!trip) return;
    const t = textInput.trim();
    if (!t) return;
    if (isLink(t)) { await handleAddLink(t); return; }

    setSearch({ query: t, status: 'loading', candidates: [] });
    const list = await searchPlaces(t, trip.city, trip.country);
    const base = tripRef.current;
    if (!base) { setSearch(null); return; }
    // Одно совпадение — сразу в инбокс, без выбора. Иначе показываем кандидатов.
    if (list.length === 1) {
      setSearch(null);
      await save(addInboxPlace(base, { ...list[0], url: placeMapsUrl(list[0].name, base.city) }));
      return;
    }
    setSearch({ query: t, status: 'done', candidates: list });
  }

  function handlePickCandidate(c: PlaceCandidate) {
    const base = tripRef.current;
    if (!base) return;
    setSearch(null);
    save(addInboxPlace(base, { ...c, url: placeMapsUrl(c.name, base.city) }));
  }

  function handleAddRaw() {
    const base = tripRef.current;
    if (!base || !search) return;
    const name = search.query;
    setSearch(null);
    save(addInboxPlace(base, { name, coords: null, desc: '' }));
  }

  // «Обновить Медиа»: живой поиск новых мест, докладываем к показанным (без дублей).
  async function handleRefreshMedia() {
    if (!trip || mediaRefreshing) return;
    setMediaRefreshing(true);
    try {
      const current = mediaItems ?? [];
      const more = await fetchMoreMedia(trip.city, trip.country, current);
      if (more.length) {
        const seen = new Set(current.map((m) => m.name.toLowerCase()));
        const fresh = more.filter((m) => !seen.has(m.name.toLowerCase()));
        if (fresh.length) setMediaItems([...fresh, ...current]); // новые — вперёд
      }
    } finally {
      setMediaRefreshing(false);
    }
  }

  // Убрать место из предложений «Медиа» (локально, поездку не трогает).
  function handleDismissMedia(id: string) {
    setMediaItems((cur) => (cur ? cur.filter((m) => m.id !== id) : cur));
    setHighlightId((h) => (h === id ? null : h));
  }

  function handleAddFromMedia(item: MediaItem) {
    const base = tripRef.current;
    if (!base) return;
    save(addInboxPlace(base, {
      name: item.name, coords: item.coords, desc: item.blurb,
      source: 'media', url: item.coords ? placeMapsUrl(item.name, base.city) : '',
    }));
  }

  // ---- Telegram-предложка ----
  function handleConnectTelegram() {
    const base = tripRef.current;
    if (!base || connecting) return;
    setConnecting(true);
    ensureTelegramLink(base.id)
      .then((link) => { if (link) setTgLink(link); })
      .finally(() => setConnecting(false));
  }

  async function handleSuggestionToDay(item: TgSuggestion, dayNumber: number) {
    const base = tripRef.current;
    if (!base) return;
    const ok = await save(addPlaceToTrip(base, dayNumber, {
      name: item.name, coords: item.coords, time: '', desc: item.description, price: null, image: item.image,
    }));
    if (!ok) return;
    await markSuggestion(item.id, 'added');
    setSuggestions((cur) => (cur ? cur.filter((s) => s.id !== item.id) : cur));
  }

  async function handleSuggestionToShopping(item: TgSuggestion) {
    const base = tripRef.current;
    if (!base) return;
    const ok = await save(addShoppingItem(base, { text: item.name, url: item.url, source: 'tg' }));
    if (!ok) return;
    await markSuggestion(item.id, 'added');
    setSuggestions((cur) => (cur ? cur.filter((s) => s.id !== item.id) : cur));
  }

  async function handleDismissSuggestion(item: TgSuggestion) {
    await markSuggestion(item.id, 'dismissed');
    setSuggestions((cur) => (cur ? cur.filter((s) => s.id !== item.id) : cur));
  }

  function handleTagSuggestion(item: TgSuggestion, tag: string) {
    setSuggestions((cur) => (cur ? cur.map((s) => (s.id === item.id ? { ...s, tag } : s)) : cur));
    setSuggestionTag(item.id, tag);
  }

  // Нужен ли предложению разбор: фото у обычной ссылки, точка у места, либо
  // надо убрать скриншот карты (у карт-ссылок og:image — это карта, не фото).
  function needsWork(s: TgSuggestion): boolean {
    if (s.url && isMapLink(s.url) && s.image) return true;            // убрать скриншот карты
    if (s.url && !isMapLink(s.url) && !s.image) return true;          // нужно фото
    if (s.kind === 'place' && !s.coords && s.name) return true;       // нужна точка
    return false;
  }
  function rawSuggestionCount(list: TgSuggestion[]): number {
    // Не считаем уже попытанные: повторный разбор того же имени/ссылки результата
    // не даст, а вечный счётчик создаёт впечатление, что кнопка не работает.
    return list.filter((s) => needsWork(s) && !processedIds.has(s.id)).length;
  }

  function patchSuggestion(id: string, fields: Partial<TgSuggestion>) {
    setSuggestions((cur) => (cur ? cur.map((s) => (s.id === id ? { ...s, ...fields } : s)) : cur));
  }

  // Разобрать ссылки предложки: фото/описание/координаты (resolveLink), а места
  // без точки догеокодить по названию (одним батчем). Результат сохраняем в БД.
  async function handleProcessSuggestions() {
    if (processingSug) return;
    const base = tripRef.current;
    const list = suggestions ?? [];
    if (!base || list.length === 0) return;
    setProcessingSug(true);
    try {
      // Центр города поездки — чтобы отбрасывать точки вне страны/региона.
      const center = await cityCenter(base.city, base.country);
      const ok = (c: Coords | null) => inRegion(c, center);
      const gotCoords = new Set<string>(list.filter((s) => ok(s.coords)).map((s) => s.id));
      const gotDesc = new Set<string>(list.filter((s) => s.description).map((s) => s.id));
      // 0a) Убрать уже сохранённые точки ВНЕ региона (левые промахи геокодера).
      await Promise.all(list.filter((s) => s.coords && !ok(s.coords)).map(async (s) => {
        patchSuggestion(s.id, { coords: null });
        await updateSuggestion(s.id, { coords: null });
      }));
      // 0b) Убрать скриншоты карт у карт-ссылок (og:image там — карта, не фото).
      await Promise.all(list.filter((s) => s.url && isMapLink(s.url) && s.image).map(async (s) => {
        patchSuggestion(s.id, { image: '' });
        await updateSuggestion(s.id, { image: '' });
      }));
      // 1) Разбираем ссылки: нужно фото (у обычных) или координаты (у любых).
      const toResolve = list.filter((s) => s.url && (!ok(s.coords) || (!isMapLink(s.url) && !s.image)));
      await runPooled(toResolve, 3, async (s) => {
        const r = await resolveLink(s.url);
        if (!r) return;
        // У карт-ссылок фото не берём (это скриншот карты). Точку берём, только
        // если она в регионе города (иначе геокодер промахнулся в другую страну).
        const image = isMapLink(s.url) ? '' : (r.image || s.image);
        const coords = ok(r.coords) ? r.coords : (ok(s.coords) ? s.coords : null);
        const fields: Partial<TgSuggestion> = { image, description: s.description || r.desc, coords };
        if (coords) gotCoords.add(s.id);
        if (fields.description) gotDesc.add(s.id);
        patchSuggestion(s.id, fields);
        await updateSuggestion(s.id, { image: fields.image, description: fields.description, coords });
      });
      // 2) Места всё ещё без координат — геокодим по «имя, город, страна» (биас на
      //    город) и берём только точки в регионе (вне страны — убираем).
      const needGeo = list.filter((s) => s.kind === 'place' && !gotCoords.has(s.id) && s.name);
      if (needGeo.length) {
        const q = needGeo.map((s) => [s.name, base.city, base.country].filter(Boolean).join(', '));
        const coords = await geocodeQueries(q);
        await Promise.all(needGeo.map(async (s, i) => {
          const c = ok(coords[i]) ? coords[i] : null;
          if (!c) return;
          patchSuggestion(s.id, { coords: c });
          await updateSuggestion(s.id, { coords: c });
        }));
      }
      // 3) Описание места (одна фраза, Haiku) — для мест без описания (напр. пункты
      //    из списков «голых названий»): чтобы на метке/карточке была строчка о месте.
      const needDesc = list.filter((s) => s.kind === 'place' && s.name && !gotDesc.has(s.id)).slice(0, 40);
      if (needDesc.length) {
        const descs = await describePlaces(needDesc.map((s) => s.name), base.city, base.country);
        await Promise.all(needDesc.map(async (s, i) => {
          const dsc = (descs[i] || '').trim();
          if (!dsc) return;
          patchSuggestion(s.id, { description: dsc });
          await updateSuggestion(s.id, { description: dsc });
        }));
      }
      // Помечаем все попытанные предложения разобранными — счётчик дойдёт до нуля,
      // а кнопка покажет «✅ Всё обработано» вместо вечного «(N)».
      const tried = list.filter(needsWork).map((s) => s.id);
      if (tried.length) setProcessedIds((prev) => new Set([...prev, ...tried]));
    } finally {
      setProcessingSug(false);
    }
  }

  // ---- Список покупок ----
  function handleAddShopping(text: string) {
    const base = tripRef.current;
    if (base) save(addShoppingItem(base, { text }));
  }
  function handleToggleShopping(id: string) {
    const base = tripRef.current;
    if (base) save(toggleShoppingItem(base, id));
  }
  function handleRemoveShopping(id: string) {
    const base = tripRef.current;
    if (base) save(removeShoppingItem(base, id));
  }

  async function handleAddLink(url: string) {
    if (!trip) return;
    const next = addInboxLink(trip, url);
    const link = next.inbox[0]; // свежая ссылка — сверху
    if (!link || !(await save(next))) return;
    // Авто-разбор на сервере, если координат из URL не вышло (короткая ссылка,
    // Instagram, блог). Карты с координатами в URL уже разобраны на фронте.
    if (link.coords) return;
    setResolving((r) => [...r, link.id]);
    const resolved = await resolveLink(link.url);
    setResolving((r) => r.filter((x) => x !== link.id));
    const base = tripRef.current;
    if (!resolved || !base || !base.inbox.some((l) => l.id === link.id)) return;
    if (resolved.coords || resolved.desc || resolved.image || (resolved.name && !link.name)) {
      save(updateInboxLink(base, link.id, {
        coords: resolved.coords ?? link.coords,
        name: resolved.name || link.name,
        desc: resolved.desc || link.desc,
        image: resolved.image || link.image,
      }));
    }
  }
  function handleRemoveLink(id: string) {
    if (!trip) return;
    save(removeInboxLink(trip, id));
  }
  function openPlaceFromInbox(linkId: string, dayNumber: number) {
    const link = trip?.inbox.find((l) => l.id === linkId);
    setDraftCoords(link?.coords ?? null);
    setForm({ mode: 'fromInbox', linkId, dayNumber });
  }

  function handleDelete(placeId: string) {
    if (!trip) return;
    if (trip.places.find((p) => p.id === placeId)?.locked) return; // замкнутые не удаляем
    if (confirm('Удалить это место?')) save(removePlaceFromTrip(trip, placeId));
  }

  function handleToggleLock(placeId: string) {
    if (!trip) return;
    save(togglePlaceLock(trip, placeId));
  }

  function handleAddChecklist(placeId: string, text: string) {
    if (!trip) return;
    save(addChecklistItem(trip, placeId, text));
  }
  function handleToggleChecklist(placeId: string, itemId: string) {
    if (!trip) return;
    save(toggleChecklistItem(trip, placeId, itemId));
  }
  function handleRemoveChecklist(placeId: string, itemId: string) {
    if (!trip) return;
    save(removeChecklistItem(trip, placeId, itemId));
  }
  function handleOptimizeDay(dayNumber: number) {
    if (!trip) return;
    const next = optimizeDayOrder(trip, dayNumber);
    if (next === trip) return; // нечего оптимизировать
    save(next);
  }

  function handleSuggestChecklist(place: Place): Promise<string[]> {
    const base = tripRef.current;
    if (!base) return Promise.resolve([]);
    return suggestChecklist({ name: place.name, city: base.city, country: base.country, kind: place.kind });
  }

  // ИИ добирает места в конкретный день (дополняет, не пересобирает; без повторов).
  async function handleAiAddDay(dayNumber: number) {
    const base = tripRef.current;
    if (!base || generatingDay !== null) return;
    setGeneratingDay(dayNumber);
    try {
      const inDay = placesForDay(base, dayNumber);
      const districts = [...new Set(inDay.map((p) => p.district).filter(Boolean))].join(', ');
      const theme = dayTheme(base, dayNumber);
      const dayContext = [
        theme ? `тема дня: ${theme}` : '',
        inDay.length ? `места: ${inDay.map((p) => p.name).join('; ')}` : '',
        districts ? `район: ${districts}` : '',
      ].filter(Boolean).join('; ');
      const draft = await generateItinerary({
        city: base.city, country: base.country,
        startDate: base.startDate, endDate: base.endDate,
        days: daysBetween(base.startDate, base.endDate),
        pace: 'moderate', interests: [], restFirstDay: false,
        targetDay: dayNumber,
        exclude: base.places.map((p) => p.name).filter(Boolean),
        dayContext,
      });
      const fresh = tripRef.current;
      if (!fresh) return;
      if (!draft) { alert('Не удалось подобрать новые места. Попробуйте ещё раз чуть позже.'); return; }
      await save(applyItinerary(fresh, draft));
    } finally {
      setGeneratingDay(null);
    }
  }

  function handleMovePlace(placeId: string, targetDay: number, targetIndex: number) {
    if (!trip) return;
    save(movePlace(trip, placeId, targetDay, targetIndex));
  }

  // ИИ собирает маршрут на сервере (живой поиск + проверка + раскладка по дням),
  // затем результат дополняет дни поездки (ручные места не трогаются).
  async function handleGenerate(pace: ItineraryPace, interests: string[], restFirstDay: boolean) {
    const base = tripRef.current;
    if (!base || generating) return;
    setGenerating(true);
    try {
      const outF = base.flights.find((f) => f.direction === 'out');
      const backF = base.flights.find((f) => f.direction === 'back');
      const dayThemes = base.days
        .map((d) => ({ day: d.number, theme: dayTheme(base, d.number) }))
        .filter((x) => x.theme);
      const draft = await generateItinerary({
        city: base.city, country: base.country,
        startDate: base.startDate, endDate: base.endDate,
        days: daysBetween(base.startDate, base.endDate),
        pace, interests, restFirstDay, dayThemes,
        arrival: outF?.date ? `${outF.date}${outF.time ? ' ' + outF.time : ''}` : '',
        departure: backF?.date ? `${backF.date}${backF.time ? ' ' + backF.time : ''}` : '',
      });
      const fresh = tripRef.current;
      if (!fresh) return;
      if (!draft) { alert('Не удалось собрать маршрут. Попробуйте ещё раз чуть позже.'); return; }
      if (await save(applyItinerary(fresh, draft))) setActiveDay(0);
    } finally {
      setGenerating(false);
    }
  }

  function handleCoverSave(patch: TripCoverSave) {
    if (!trip) return;
    save(updateTripMeta(trip, patch));
  }

  async function handleSaveLogistics(flights: Flight[], hotels: Hotel[]) {
    if (!trip) return;
    // Геокодим отели без координат по названию (+ город), чтобы показать на карте.
    const need = hotels.filter((h) => h.name.trim() && !h.coords);
    let withCoords = hotels;
    if (need.length) {
      // По самому имени: кириллический город Nominatim не находит, а названия
      // отелей обычно самодостаточны (бренд + город уже в названии).
      const coords = await geocodeQueries(need.map((h) => h.name));
      const byId = new Map(need.map((h, i) => [h.id, coords[i]] as const));
      withCoords = hotels.map((h) => (byId.has(h.id) ? { ...h, coords: byId.get(h.id) ?? h.coords } : h));
    }
    save(setHotels(setFlights(trip, flights), withCoords));
  }
  function handleClearItinerary() {
    if (!trip) return;
    save(clearItinerary(trip));
  }

  // Закрыть настройки и перейти к установке точки отеля кликом по карте.
  function handlePickHotelOnMap(hotelId: string) {
    setSettingsOpen(false);
    setPickHotel(hotelId);
    if (mapRef.current) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      mapRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    }
  }

  function handleReorderDays(order: number[]) {
    const base = tripRef.current;
    if (!base) return;
    const next = reorderDays(base, order);
    if (next !== base) save(next);
  }

  function handleSaveDay(dayNumber: number, patch: DaySave) {
    if (!trip) return;
    let next = trip;
    let cat = patch.cat;
    if (patch.newCategory) {
      const res = addCategory(next, patch.newCategory);
      next = res.trip;
      cat = res.key;
    }
    save(updateDay(next, dayNumber, { title: patch.title, cat }));
  }

  function openAdd(dayNumber: number) {
    setDraftCoords(null);
    setForm({ mode: 'add', dayNumber });
  }
  function openEdit(placeId: string) {
    const p = trip?.places.find((x) => x.id === placeId);
    setDraftCoords(p?.coords ?? null);
    setForm({ mode: 'edit', id: placeId });
  }
  function closeForm() { setForm({ mode: 'closed' }); setPicking(false); setDraftCoords(null); }

  if (notFound) {
    return <div className={styles.notfound}>Поездка не найдена. <a href="/app">← Мои поездки</a></div>;
  }
  if (session.status !== 'authed' || !trip) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  const editing = form.mode === 'edit' ? trip.places.find((p) => p.id === form.id) : undefined;
  const fromLink = form.mode === 'fromInbox' ? trip.inbox.find((l) => l.id === form.linkId) : undefined;
  const initial: PlaceInput | undefined = editing
    ? { name: editing.name, coords: editing.coords, time: editing.time, desc: editing.desc, price: editing.price, image: editing.image, kind: editing.kind, by: editing.by, note: editing.note }
    : fromLink
      ? { name: fromLink.name, coords: fromLink.coords, time: '', desc: fromLink.desc ?? '', price: null, image: fromLink.image ?? '', kind: '', by: '', note: '' }
      : undefined;

  // Имена мест, уже разложенных по дням, — чтобы слои показывали только то, чего
  // ещё НЕТ в маршруте (фильтр «рядом, но не добавлено»).
  const routeNames = new Set(
    trip.places.filter((p) => (p.dayNumber ?? 0) >= 1).map((p) => p.name.trim().toLowerCase()),
  );
  const norm = (s: string) => (s || '').trim().toLowerCase();
  // Метки слоёв для карты (с координатами; для наложения на маршрут — без уже добавленных).
  const sugAllMarkers = (suggestions ?? []).filter((s) => s.coords)
    // Нет исходной ссылки (фото/пересланное без URL) — даём ссылку «открыть
    // карточку места» поиском по названию, как у «Медиа».
    .map((s) => ({ id: s.id, name: s.name, coords: s.coords as Coords, kind: s.kind,
      url: s.url || (s.name ? placeMapsUrl(s.name, trip.city) : ''), desc: s.description, tag: s.tag }));
  const sugLayerMarkers = sugAllMarkers.filter((s) => !routeNames.has(norm(s.name)));
  const mediaLayerMarkers = (mediaItems ?? []).filter((m) => m.coords && !routeNames.has(norm(m.name)));

  return (
    <main>
      <PlannerHeader title={trip.title} startDate={trip.startDate} endDate={trip.endDate} />

      <div className={styles.shell}>
        <TripCover
          city={trip.city}
          title={trip.title}
          lead={trip.lead}
          companions={trip.companions}
          coverImage={trip.coverImage}
          dateRange={formatDateRange(trip.startDate, trip.endDate)}
          busy={busy}
          onSave={handleCoverSave}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <Inbox links={trip.inbox} days={trip.days} busy={busy} resolving={resolving} search={search}
          onAdd={handleAdd} onRemoveLink={handleRemoveLink} onPlace={openPlaceFromInbox}
          onPickCandidate={handlePickCandidate} onAddRaw={handleAddRaw} onDismissSearch={() => setSearch(null)} />

        <AiItinerary busy={busy} generating={generating} onGenerate={handleGenerate} />

        {movableDayNumbers(trip).length > 0 && (
          <div className={styles.dayTools}>
            <button type="button" className={styles.layer} onClick={() => setReorderOpen(true)}>↕ Порядок дней</button>
          </div>
        )}

        <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay}
          inboxCount={suggestions?.length ?? 0}
          onSelect={(d) => { setActiveDay(d); setHighlightId(null); }} />

        {activeDay >= 0 && (
          <div className={styles.layers} role="group" aria-label="Слои на карте">
            <span className={styles.layersLabel}>Слои на карте:</span>
            <button type="button" className={layerMedia ? styles.layerOn : styles.layer}
              aria-pressed={layerMedia} onClick={() => setLayerMedia((v) => !v)}>
              ✨ Медиа{layerMedia ? (mediaLoading ? '…' : ` (${mediaLayerMarkers.length})`) : ''}
            </button>
            <button type="button" className={layerSug ? styles.layerOn : styles.layer}
              aria-pressed={layerSug} onClick={() => setLayerSug((v) => !v)}>
              ✨ Предложка{layerSug ? (processingSug ? '…' : ` (${sugLayerMarkers.length})`) : ''}
            </button>
          </div>
        )}

        <div className={styles.mapSection} ref={mapRef}>
          <TripMap trip={trip} day={activeDay} picking={picking || pickHotel !== null} draftCoords={draftCoords}
            onMapClick={(c) => {
              if (pickHotel) {
                const base = tripRef.current;
                if (base) save(setHotels(base, base.hotels.map((h) => (h.id === pickHotel ? { ...h, coords: c } : h))));
                setPickHotel(null);
              } else {
                setDraftCoords(c); setPicking(false);
              }
            }}
            onPlaceClick={openEdit}
            media={activeDay === MEDIA_TAB ? (mediaItems ?? [])
              : (activeDay >= 0 && layerMedia) ? mediaLayerMarkers : undefined}
            suggestions={activeDay === INBOX_TAB ? sugAllMarkers
              : (activeDay >= 0 && layerSug) ? sugLayerMarkers : undefined}
            highlightId={highlightId} onMediaClick={setHighlightId}
            hotels={trip.hotels} />
        </div>

        {activeDay === INBOX_TAB ? (
          <>
            <SuggestionBoard items={suggestions ?? []} days={trip.days} loading={suggestLoading} busy={busy}
              link={tgLink} botName={process.env.NEXT_PUBLIC_TELEGRAM_BOT || '@tripsplan_bot'} connecting={connecting}
              processing={processingSug} rawCount={rawSuggestionCount(suggestions ?? [])}
              onProcess={handleProcessSuggestions}
              onConnect={handleConnectTelegram} onAddToDay={handleSuggestionToDay}
              onAddToShopping={handleSuggestionToShopping} onDismiss={handleDismissSuggestion}
              onTag={handleTagSuggestion} />
            <ShoppingList items={trip.shopping ?? []} busy={busy}
              onAdd={handleAddShopping} onToggle={handleToggleShopping} onRemove={handleRemoveShopping} />
          </>
        ) : activeDay === MEDIA_TAB ? (
          <MediaBoard items={mediaItems ?? []} loading={mediaLoading} highlightId={highlightId} busy={busy}
            refreshing={mediaRefreshing} onHover={setHighlightId} onAdd={handleAddFromMedia} onRefresh={handleRefreshMedia}
            onDismiss={handleDismissMedia} />
        ) : (
          <Timeline trip={trip} day={activeDay} categories={trip.categories} busy={busy}
            onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
            onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }}
            onSaveDay={handleSaveDay} onMovePlace={handleMovePlace}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleLock={handleToggleLock} onAiAddDay={handleAiAddDay} onOptimizeDay={handleOptimizeDay} generatingDay={generatingDay}
            onAddChecklist={handleAddChecklist} onToggleChecklist={handleToggleChecklist} onRemoveChecklist={handleRemoveChecklist}
            onSuggestChecklist={handleSuggestChecklist} />
        )}
      </div>

      {/* Форма места — модалка. В режиме выбора точки прячем (не размонтируя, чтобы сохранить ввод). */}
      {form.mode !== 'closed' && (
        <div className={picking ? styles.modalHidden : styles.modal}>
          <div className={styles.modalInner}>
            <PlaceForm
              key={form.mode === 'edit' ? form.id : form.mode === 'fromInbox' ? `inbox_${form.linkId}` : 'add'}
              coords={draftCoords}
              initial={initial}
              busy={busy}
              companions={trip.companions}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              onPickCoords={() => setPicking(true)}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <TripSettings
          startDate={trip.startDate} endDate={trip.endDate}
          flights={trip.flights} hotels={trip.hotels} busy={busy}
          onSave={handleSaveLogistics} onClearItinerary={handleClearItinerary}
          onPickOnMap={handlePickHotelOnMap}
          onClose={() => setSettingsOpen(false)} />
      )}

      {reorderOpen && (
        <DayReorder days={trip.days} reorderable={movableDayNumbers(trip)} busy={busy}
          onApply={handleReorderDays} onClose={() => setReorderOpen(false)} />
      )}

      {/* Подсказка во время выбора точки на карте */}
      {(picking || pickHotel) && (
        <div className={styles.pickHint} role="status">
          <span>{pickHotel ? 'Кликните по карте, где находится отель' : 'Кликните по карте, чтобы поставить точку места'}</span>
          <button type="button" onClick={() => { setPicking(false); setPickHotel(null); }}>{pickHotel ? 'Отмена' : 'Готово'}</button>
        </div>
      )}
    </main>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Загрузка…</div>}>
      <PlannerInner />
    </Suspense>
  );
}
