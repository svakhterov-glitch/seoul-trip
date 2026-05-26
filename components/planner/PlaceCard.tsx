'use client';

import { type Place, type Category, getPlaceKind } from '@/lib/entities';
import { PriceBadge, KindBadge, PersonBadge } from './badges';
import styles from './PlaceCard.module.css';

interface Props {
  place: Place;
  category: Category | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PlaceCard({ place, category, onSelect, onEdit, onDelete }: Props) {
  const emoji = getPlaceKind(place.kind)?.emoji || place.photo || '📍';
  const stripe = category?.color || '#cbd2e6';
  const hasBadges = !!place.kind || (place.price !== null && place.price !== undefined) || !!place.by;

  return (
    <div className={styles.item} role="button" tabIndex={0}
      aria-label={`${place.time ? place.time + ', ' : ''}${place.name}`}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(place.id); } }}>
      <div className={styles.rail}>
        {place.time && <span className={styles.time}>{place.time}</span>}
      </div>
      <div className={styles.card} style={{ '--stripe': stripe } as React.CSSProperties}>
        <div className={styles.actions}>
          <button type="button" className={styles.act} aria-label={`Изменить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button type="button" className={styles.act} aria-label={`Удалить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
        <div className={styles.row}>
          {place.image
            ? <img className={styles.thumb} src={place.image} alt={place.name} loading="lazy" />
            : <div className={styles.thumbEmoji} aria-hidden="true">{emoji}</div>}
          <div className={styles.main}>
            <div className={styles.name}>{place.name}</div>
            {place.desc && <div className={styles.desc}>{place.desc}</div>}
            {place.note && <div className={styles.note}>💬 {place.note}</div>}
            {hasBadges && (
              <div className={styles.badges}>
                <KindBadge kind={place.kind} />
                <PriceBadge price={place.price} />
                <PersonBadge name={place.by} />
              </div>
            )}
            {place.sourceUrl && (
              <a className={styles.source} href={place.sourceUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>источник ↗</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
