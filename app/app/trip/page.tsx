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
} from '@/lib/entities';
import { formatDateRange } from '@/lib/days';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { TripCover, type TripCoverSave } from '@/components/planner/TripCover';
import { DayTabs } from '@/components/planner/DayTabs';
import { Timeline } from '@/components/planner/Timeline';
import { PlaceForm } from '@/components/planner/PlaceForm';
import styles from './page.module.css';

const TripMap = dynamic(() => import('@/components/planner/TripMap').then((m) => m.TripMap), { ssr: false });

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; dayNumber: number }
  | { mode: 'edit'; id: string };

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
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed' || !id) return;
    getTrip(getSupabase(), id).then(async (t) => {
      if (!t) { setNotFound(true); return; }
      const fixed = ensureTripDefaults(t);
      if (fixed !== t) await updateTrip(getSupabase(), fixed);
      setTrip(fixed);
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
        : trip;
    if (await save(next)) closeForm();
  }

  function handleDelete(placeId: string) {
    if (!trip) return;
    if (confirm('Удалить это место?')) save(removePlaceFromTrip(trip, placeId));
  }

  function handleCoverSave(patch: TripCoverSave) {
    if (!trip) return;
    save(updateTripMeta(trip, patch));
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
  const initial: PlaceInput | undefined = editing
    ? { name: editing.name, coords: editing.coords, time: editing.time, desc: editing.desc, price: editing.price, image: editing.image, kind: editing.kind, by: editing.by, note: editing.note }
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

        <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay} onSelect={setActiveDay} />

        <div className={styles.mapSection} ref={mapRef}>
          <TripMap trip={trip} day={activeDay} picking={picking} draftCoords={draftCoords}
            onMapClick={(c) => { setDraftCoords(c); setPicking(false); }}
            onPlaceClick={openEdit} />
        </div>

        <Timeline trip={trip} day={activeDay}
          onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
          onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }} />
      </div>

      {/* Форма места — модалка. В режиме выбора точки прячем (не размонтируя, чтобы сохранить ввод). */}
      {form.mode !== 'closed' && (
        <div className={picking ? styles.modalHidden : styles.modal}>
          <div className={styles.modalInner}>
            <PlaceForm
              key={form.mode === 'edit' ? form.id : 'add'}
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
