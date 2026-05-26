'use client';

import { type Place, type Category, getPlaceKind } from '@/lib/entities';
import { CatBadge, PriceBadge, KindBadge, PersonBadge } from './badges';
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
            onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>✏️</button>
          <button type="button" className={styles.act} aria-label={`Удалить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}>🗑</button>
        </div>
        <div className={styles.row}>
          {place.image
            ? <img className={styles.thumb} src={place.image} alt={place.name} loading="lazy" />
            : <div className={styles.thumbEmoji} aria-hidden="true">{emoji}</div>}
          <div className={styles.main}>
            <div className={styles.name}>{place.name}</div>
            {place.desc && <div className={styles.desc}>{place.desc}</div>}
            {place.note && <div className={styles.note}>💬 {place.note}</div>}
            <div className={styles.badges}>
              <KindBadge kind={place.kind} />
              <CatBadge category={category} />
              <PriceBadge price={place.price} />
              <PersonBadge name={place.by} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
