'use client';

import { useState } from 'react';
import { type TripDoc, type Category, getCategory, placesForDay } from '@/lib/entities';
import { PlaceCard } from './PlaceCard';
import { CatBadge } from './badges';
import { DayForm, type DaySave } from './DayForm';
import styles from './Timeline.module.css';

interface Props {
  trip: TripDoc;
  day: number; // 0 = весь маршрут
  categories?: Category[];
  busy?: boolean;
  onAddPlace: (dayNumber: number) => void;
  onEditPlace: (id: string) => void;
  onDeletePlace: (id: string) => void;
  onSelectPlace: (id: string) => void;
  onSaveDay?: (dayNumber: number, patch: DaySave) => void;
}

export function Timeline({ trip, day, categories = [], busy = false, onAddPlace, onEditPlace, onDeletePlace, onSelectPlace, onSaveDay }: Props) {
  const [editDay, setEditDay] = useState<number | null>(null);
  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  return (
    <div className={styles.wrap}>
      {days.length === 0 && <div className={styles.empty}>Дни поездки ещё не сформированы.</div>}
      {days.map((d) => {
        const places = placesForDay(trip, d.number);
        const cat = getCategory(trip, d.cat);
        return (
          <section key={d.number} className={styles.daySec}>
            {editDay === d.number ? (
              <DayForm day={d} categories={categories} busy={busy}
                onSave={(patch) => { onSaveDay?.(d.number, patch); setEditDay(null); }}
                onCancel={() => setEditDay(null)} />
            ) : (
              <div className={styles.head}>
                <div className={styles.headTop}>
                  <span className={styles.dlabel}>День {d.number} · {d.date}</span>
                  <div className={styles.headActions}>
                    {onSaveDay && (
                      <button type="button" className={styles.editDay} onClick={() => setEditDay(d.number)}>Изменить день</button>
                    )}
                    <button type="button" className={styles.add} onClick={() => onAddPlace(d.number)}>＋ Добавить место</button>
                  </div>
                </div>
                <div className={styles.titleRow}>
                  <h3 className={styles.dtitle}>{d.title}</h3>
                  {cat && <CatBadge category={cat} />}
                </div>
              </div>
            )}
            {places.length === 0
              ? <div className={styles.empty}>На этот день пока ничего не запланировано. Добавьте место кнопкой выше.</div>
              : places.map((p) => (
                  <PlaceCard key={p.id} place={p} category={cat}
                    onSelect={onSelectPlace} onEdit={onEditPlace} onDelete={onDeletePlace} />
                ))}
          </section>
        );
      })}
    </div>
  );
}
