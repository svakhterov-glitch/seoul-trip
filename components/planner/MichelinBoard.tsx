'use client';

import { useState } from 'react';
import { type MichelinItem, MICHELIN_DISTINCTIONS, starCount } from '@/lib/michelin';
import { MichelinTile } from './MichelinTile';
import styles from './MichelinBoard.module.css';

interface Props {
  items: MichelinItem[];
  loading: boolean;
  highlightId: string | null;
  busy?: boolean;
  onHover: (id: string | null) => void;
  onAdd: (item: MichelinItem) => void;
}

type Filter = 'all' | 'star' | 'bib' | 'plate';

const FILTERS: { key: Filter; label: string; color?: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'star', label: '★ Звёзды', color: '#c8102e' },
  { key: 'bib', label: 'Bib Gourmand', color: '#d99a1b' },
  { key: 'plate', label: 'Selected', color: '#5b6470' },
];

function matches(item: MichelinItem, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'star') return starCount(item.distinction) > 0;
  return item.distinction === f;
}

/** Витрина доски «Мишлен»: карточки ресторанов гида + фильтр по отличию. */
export function MichelinBoard({ items, loading, highlightId, busy = false, onHover, onAdd }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = items.filter((i) => matches(i, filter));
  const count = (f: Filter) => items.filter((i) => matches(i, f)).length;

  return (
    <section className={styles.wrap} aria-label="Мишлен — рестораны гида">
      <div className={styles.head}>
        <span className={styles.title}>Мишлен · рестораны гида</span>
        {items.length > 0 && (
          <div className={styles.filters} role="group" aria-label="Фильтр по отличию">
            {FILTERS.map((f) => (
              <button key={f.key} type="button"
                className={`${styles.filter} ${filter === f.key ? styles.filterOn : ''}`}
                style={filter === f.key && f.color ? { background: f.color, borderColor: f.color, color: '#fff' } : undefined}
                onClick={() => setFilter(f.key)}>
                {f.color && <span className={styles.dot} style={{ background: f.color }} aria-hidden="true" />}
                {f.label} <span className={styles.cnt}>{count(f.key)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className={styles.note}>
        Звёзды и Bib Gourmand — по гиду MICHELIN; «Selected» — прочие рестораны гида. Цена — ориентир по тиру (точных сумм в гиде нет).
      </p>

      {loading ? (
        <p className={styles.note} role="status">Загружаем рестораны гида…</p>
      ) : items.length === 0 ? (
        <p className={styles.note}>Для этого города подборки гида пока нет.</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((it) => (
            <MichelinTile key={it.id} item={it} highlighted={highlightId === it.id} busy={busy} onHover={onHover} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  );
}
