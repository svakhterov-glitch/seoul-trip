'use client';

import { useState } from 'react';
import { type MediaItem, type MediaRubric, MEDIA_RUBRICS } from '@/lib/media';
import { MediaTile } from './MediaTile';
import styles from './MediaBoard.module.css';

interface Props {
  items: MediaItem[];
  loading: boolean;
  highlightId: string | null;
  busy?: boolean;
  onHover: (id: string | null) => void;
  onAdd: (item: MediaItem) => void;
}

type Filter = 'all' | MediaRubric;

/** Витрина доски «Медиа»: квадратные плитки + фильтр по рубрикам (он же легенда). */
export function MediaBoard({ items, loading, highlightId, busy = false, onHover, onAdd }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? items : items.filter((i) => i.rubric === filter);

  return (
    <section className={styles.wrap} aria-label="Медиа — трендовые места">
      <div className={styles.head}>
        <span className={styles.title}>✨ Медиа · что советуют гиды</span>
        {items.length > 0 && (
          <div className={styles.filters} role="group" aria-label="Фильтр по рубрикам">
            <button type="button" className={`${styles.filter} ${filter === 'all' ? styles.filterOn : ''}`} onClick={() => setFilter('all')}>Все</button>
            {MEDIA_RUBRICS.map((r) => (
              <button key={r.key} type="button"
                className={`${styles.filter} ${filter === r.key ? styles.filterOn : ''}`}
                style={filter === r.key ? { background: r.color, borderColor: r.color, color: '#fff' } : undefined}
                onClick={() => setFilter((f) => (f === r.key ? 'all' : r.key))}>
                <span className={styles.dot} style={{ background: r.color }} aria-hidden="true" />{r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className={styles.note} role="status">Подбираем трендовые места из медиа-подборок…</p>
      ) : items.length === 0 ? (
        <p className={styles.note}>Пока не удалось собрать подборку для этого города. Попробуйте обновить позже.</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((it) => (
            <MediaTile key={it.id} item={it} highlighted={highlightId === it.id} busy={busy} onHover={onHover} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  );
}
