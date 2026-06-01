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
  updateDay, addCategory, movePlace, addInboxLink, removeInboxLink, updateInboxLink, addPlaceFromInbox, addInboxPlace,
  applyItinerary, setFlights, setHotels, clearItinerary, togglePlaceLock, placesForDay, getCategory,
  addChecklistItem, toggleChecklistItem, removeChecklistItem, type Flight, type Hotel,
} from '@/lib/entities';
import { resolveLink } from '@/lib/resolveLink';
import { isLink } from '@/lib/parseLink';
import { searchPlaces, placeMapsUrl, type PlaceCandidate } from '@/lib/searchPlaces';
import { generateItinerary, type ItineraryPace } from '@/lib/generateItinerary';
import { geocodeQueries } from '@/lib/geocode';
import { fetchMediaBoard, fetchMoreMedia } from '@/lib/mediaBoard';
import { type MediaItem } from '@/lib/media';
import { formatDateRange, daysBetween } from '@/lib/days';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { AiItinerary } from '@/components/planner/AiItinerary';
import { TripSettings } from '@/components/planner/TripSettings';
import { TripCover, type TripCoverSave } from '@/components/planner/TripCover';
import { DayTabs, MEDIA_TAB } from '@/components/planner/DayTabs';
import { Inbox, type SearchState } from '@/components/planner/Inbox';
import { Timeline } from '@/components/planner/Timeline';
import { MediaBoard } from '@/components/planner/MediaBoard';
import { type DaySave } from '@/components/planner/DayForm';
import { PlaceForm } from '@/components/planner/PlaceForm';
import styles from './page.module.css';

const TripMap = dynamic(() => import('@/components/planner/TripMap').then((m) => m.TripMap), { ssr: false });

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; dayNumber: number }
  | { mode: 'edit'; id: string }
  | { mode: 'fromInbox'; linkId: string; dayNumber: number };

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
  // номер дня, для которого ИИ сейчас добирает места (null — нет)
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  // id отеля, точку которого ставим кликом по карте (null — не ставим)
  const [pickHotel, setPickHotel] = useState<string | null>(null);
  // доска «Медиа»: подборка трендовых мест (null — ещё не загружали), подсветка метки
  const [mediaItems, setMediaItems] = useState<MediaItem[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaRefreshing, setMediaRefreshing] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
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

  // доска «Медиа» подгружается лениво при первом открытии вкладки
  useEffect(() => {
    if (activeDay !== MEDIA_TAB || !trip || mediaItems !== null || mediaLoading) return;
    setMediaLoading(true);
    fetchMediaBoard(trip.city, trip.country)
      .then((list) => setMediaItems(list))
      .finally(() => setMediaLoading(false));
  }, [activeDay, trip, mediaItems, mediaLoading]);

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

        <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay}
          onSelect={(d) => { setActiveDay(d); setHighlightId(null); }} />

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
            media={activeDay === MEDIA_TAB ? (mediaItems ?? []) : undefined}
            highlightId={highlightId} onMediaClick={setHighlightId}
            hotels={activeDay === MEDIA_TAB ? undefined : trip.hotels} />
        </div>

        {activeDay === MEDIA_TAB ? (
          <MediaBoard items={mediaItems ?? []} loading={mediaLoading} highlightId={highlightId} busy={busy}
            refreshing={mediaRefreshing} onHover={setHighlightId} onAdd={handleAddFromMedia} onRefresh={handleRefreshMedia}
            onDismiss={handleDismissMedia} />
        ) : (
          <Timeline trip={trip} day={activeDay} categories={trip.categories} busy={busy}
            onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
            onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }}
            onSaveDay={handleSaveDay} onMovePlace={handleMovePlace}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleLock={handleToggleLock} onAiAddDay={handleAiAddDay} generatingDay={generatingDay}
            onAddChecklist={handleAddChecklist} onToggleChecklist={handleToggleChecklist} onRemoveChecklist={handleRemoveChecklist} />
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
