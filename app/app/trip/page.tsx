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
} from '@/lib/entities';
import { resolveLink } from '@/lib/resolveLink';
import { isLink } from '@/lib/parseLink';
import { searchPlaces, placeMapsUrl, type PlaceCandidate } from '@/lib/searchPlaces';
import { formatDateRange } from '@/lib/days';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { TripCover, type TripCoverSave } from '@/components/planner/TripCover';
import { DayTabs } from '@/components/planner/DayTabs';
import { Inbox, type SearchState } from '@/components/planner/Inbox';
import { Timeline } from '@/components/planner/Timeline';
import { type DaySave } from '@/components/planner/DayForm';
import { PlaceForm } from '@/components/planner/PlaceForm';
import styles from './page.module.css';

const TripMap = dynamic(() => import('@/components/planner/TripMap').then((m) => m.TripMap), { ssr: false });

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; dayNumber: number }
  | { mode: 'edit'; id: string }
  | { mode: 'fromInbox'; linkId: string; dayNumber: number };

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
    if (confirm('Удалить это место?')) save(removePlaceFromTrip(trip, placeId));
  }

  function handleMovePlace(placeId: string, targetDay: number, targetIndex: number) {
    if (!trip) return;
    save(movePlace(trip, placeId, targetDay, targetIndex));
  }

  function handleCoverSave(patch: TripCoverSave) {
    if (!trip) return;
    save(updateTripMeta(trip, patch));
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
        />

        <Inbox links={trip.inbox} days={trip.days} busy={busy} resolving={resolving} search={search}
          onAdd={handleAdd} onRemoveLink={handleRemoveLink} onPlace={openPlaceFromInbox}
          onPickCandidate={handlePickCandidate} onAddRaw={handleAddRaw} onDismissSearch={() => setSearch(null)} />

        <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay} onSelect={setActiveDay} />

        <div className={styles.mapSection} ref={mapRef}>
          <TripMap trip={trip} day={activeDay} picking={picking} draftCoords={draftCoords}
            onMapClick={(c) => { setDraftCoords(c); setPicking(false); }}
            onPlaceClick={openEdit} />
        </div>

        <Timeline trip={trip} day={activeDay} categories={trip.categories} busy={busy}
          onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
          onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }}
          onSaveDay={handleSaveDay} onMovePlace={handleMovePlace} />
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

      {/* Подсказка во время выбора точки на карте */}
      {picking && (
        <div className={styles.pickHint} role="status">
          <span>Кликните по карте, чтобы поставить точку места</span>
          <button type="button" onClick={() => setPicking(false)}>Готово</button>
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
