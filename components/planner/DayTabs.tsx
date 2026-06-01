'use client';

import type { Day, Category } from '@/lib/entities';
import styles from './DayTabs.module.css';

/** Сентинел «Медиа» — оставлен для совместимости (TripMap), как вкладка не используется. */
export const MEDIA_TAB = -1;
/** Сентинел «Предложка» — оставлен для совместимости, как вкладка не используется. */
export const INBOX_TAB = -2;

interface Props {
  days: Day[];
  categories: Category[];
  activeDay: number;
  onSelect: (day: number) => void;
}

export function DayTabs({ days, categories, activeDay, onSelect }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Дни поездки">
      <button type="button" role="tab" aria-selected={activeDay === 0}
        className={activeDay === 0 ? styles.tabOn : styles.tab}
        onClick={() => onSelect(0)}>Весь маршрут</button>
      {days.map((d) => {
        const color = categories.find((c) => c.key === d.cat)?.color;
        const on = activeDay === d.number;
        return (
          <button key={d.number} type="button" role="tab" aria-selected={on}
            className={on ? styles.tabOn : styles.tab}
            style={on && color ? { background: color, borderColor: color, color: '#fff' } : undefined}
            onClick={() => onSelect(d.number)}>
            <span className={styles.dnum}>День {d.number}</span>
            <span className={styles.ddate}>{d.date}</span>
          </button>
        );
      })}
    </div>
  );
}
