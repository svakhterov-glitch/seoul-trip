'use client';

import type { TripSummary } from '@/lib/trips';
import styles from './TripsGrid.module.css';

interface Props {
  trips: TripSummary[];
  onNew: () => void;
  onOpen: (id: string) => void;
}

export function TripsGrid({ trips, onNew, onOpen }: Props) {
  return (
    <div className={styles.grid}>
      {trips.map((t) => (
        <button key={t.id} type="button" className={styles.card} onClick={() => onOpen(t.id)}>
          <h3 className={styles.title}>{t.title}</h3>
          <p className={styles.meta}>{t.city}, {t.country}</p>
          <p className={styles.dates}>{t.startDate} — {t.endDate}</p>
        </button>
      ))}
      <button type="button" className={styles.newCard} onClick={onNew}>+ Новая поездка</button>
    </div>
  );
}
