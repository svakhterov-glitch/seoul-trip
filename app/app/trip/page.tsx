'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { getTrip, updateTrip } from '@/lib/trips';
import {
  type TripDoc, type Coords, type PlaceInput,
  ensureDays, addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip,
} from '@/lib/entities';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
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

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed' || !id) return;
    getTrip(getSupabase(), id).then(async (t) => {
      if (!t) { setNotFound(true); return; }
      const fixed = ensureDays(t);
      if (fixed !== t) await updateTrip(getSupabase(), fixed);
      setTrip(fixed);
    }).catch(() => setNotFound(true));
  }, [session.status, id, router]);

  async function persist(next: TripDoc) {
    setBusy(true);
    try {
      await updateTrip(getSupabase(), next);
      setTrip(next);
      setForm({ mode: 'closed' });
      setPicking(false);
      setDraftCoords(null);
    } catch {
      alert('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(input: PlaceInput) {
    if (!trip) return;
    if (form.mode === 'add') persist(addPlaceToTrip(trip, form.dayNumber, input));
    else if (form.mode === 'edit') persist(updatePlaceInTrip(trip, form.id, { ...input }));
  }

  function handleDelete(placeId: string) {
    if (!trip) return;
    if (confirm('Удалить это место?')) persist(removePlaceFromTrip(trip, placeId));
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
    ? { name: editing.name, coords: editing.coords, time: editing.time, desc: editing.desc, price: editing.price, image: editing.image }
    : undefined;

  return (
    <main>
      <PlannerHeader title={trip.title} startDate={trip.startDate} endDate={trip.endDate} />
      <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay} onSelect={setActiveDay} />
      <div className={styles.layout}>
        <div className={styles.left}>
          <Timeline trip={trip} day={activeDay}
            onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
            onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }} />
          {form.mode !== 'closed' && (
            <div className={styles.formWrap}>
              <div className={styles.formInner}>
                <PlaceForm
                  key={form.mode === 'edit' ? form.id : 'add'}
                  coords={draftCoords}
                  initial={initial}
                  busy={busy}
                  onSubmit={handleSubmit}
                  onCancel={closeForm}
                  onPickCoords={() => setPicking(true)}
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.right}>
          <TripMap trip={trip} day={activeDay} picking={picking} draftCoords={draftCoords}
            onMapClick={(c) => { setDraftCoords(c); setPicking(false); }}
            onPlaceClick={openEdit} />
        </div>
      </div>
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
