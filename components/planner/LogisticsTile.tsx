'use client';

import styles from './LogisticsTile.module.css';

export type LogisticsKind = 'flight-in' | 'flight-out' | 'hotel-in' | 'hotel-out';

interface Props {
  kind: LogisticsKind;
  title: string;     // основная строка (аэропорт / название отеля)
  subtitle?: string; // вторая строка (время/рейс/даты)
  onEdit?: () => void;
}

const META: Record<LogisticsKind, { emoji: string; label: string }> = {
  'flight-in': { emoji: '🛬', label: 'Прилёт' },
  'flight-out': { emoji: '🛫', label: 'Вылет' },
  'hotel-in': { emoji: '🏨', label: 'Заселение' },
  'hotel-out': { emoji: '🏨', label: 'Выезд из отеля' },
};

/**
 * Закреплённая плитка перелёта/отеля. Read-only в ленте дня — правится только в
 * настройках поездки. Клик/Enter открывает настройки.
 */
export function LogisticsTile({ kind, title, subtitle, onEdit }: Props) {
  const m = META[kind];
  return (
    <div className={`${styles.tile} ${styles[kind]}`} role="button" tabIndex={0}
      aria-label={`${m.label}: ${title}${subtitle ? ', ' + subtitle : ''}. Изменить в настройках поездки`}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit?.(); } }}>
      <span className={styles.emoji} aria-hidden="true">{m.emoji}</span>
      <div className={styles.body}>
        <div className={styles.label}>{m.label}</div>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.sub}>{subtitle}</div>}
      </div>
      <span className={styles.lock} aria-hidden="true" title="Правится в настройках поездки">🔒</span>
    </div>
  );
}
