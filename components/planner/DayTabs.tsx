'use client';

import type { Day, Category } from '@/lib/entities';
import styles from './DayTabs.module.css';

/** Сентинел вкладки «Медиа» (доска трендовых мест) — слева от «Весь маршрут». */
export const MEDIA_TAB = -1;
/** Сентинел вкладки «Предложка» (входящее из Telegram + список покупок). */
export const INBOX_TAB = -2;
/** Сентинел вкладки «Мишлен» (рестораны гида). */
export const MICHELIN_TAB = -3;

interface Props {
  days: Day[];
  categories: Category[];
  activeDay: number;
  onSelect: (day: number) => void;
  /** Сколько новых предложений в Telegram-предложке (для бейджа). */
  inboxCount?: number;
  /** Показывать вкладку «Мишлен» (есть подборка гида для города — пока только Сеул). */
  showMichelin?: boolean;
}

export function DayTabs({ days, categories, activeDay, onSelect, inboxCount = 0, showMichelin = false }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Дни поездки">
      <button type="button" role="tab" aria-selected={activeDay === INBOX_TAB}
        className={`${activeDay === INBOX_TAB ? styles.tabOn : styles.tab} ${styles.media}`}
        onClick={() => onSelect(INBOX_TAB)}>✨ Предложка{inboxCount > 0 && <span className={styles.badge}>{inboxCount}</span>}</button>
      <button type="button" role="tab" aria-selected={activeDay === MEDIA_TAB}
        className={`${activeDay === MEDIA_TAB ? styles.tabOn : styles.tab} ${styles.media}`}
        onClick={() => onSelect(MEDIA_TAB)}>✨ Медиа</button>
      {showMichelin && (
        <button type="button" role="tab" aria-selected={activeDay === MICHELIN_TAB}
          className={`${activeDay === MICHELIN_TAB ? styles.tabOn : styles.tab} ${styles.media}`}
          onClick={() => onSelect(MICHELIN_TAB)}>✨ Мишлен</button>
      )}
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
