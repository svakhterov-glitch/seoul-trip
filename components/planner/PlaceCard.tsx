'use client';

import type { Place, Category } from '@/lib/entities';
import { CatBadge, PriceBadge } from './badges';
import styles from './PlaceCard.module.css';

interface Props {
  place: Place;
  category: Category | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PlaceCard({ place, category, onSelect, onEdit, onDelete }: Props) {
  return (
    <div className={styles.item} role="button" tabIndex={0}
      aria-label={`${place.time ? place.time + ', ' : ''}${place.name}`}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(place.id); } }}>
      <div className={styles.time}>{place.time || ''}</div>
      <div className={styles.dot}>
        {place.image
          ? <img className={styles.thumb} src={place.image} alt={place.name} loading="lazy" />
          : <span aria-hidden="true">{place.photo}</span>}
      </div>
      <div className={styles.card}>
        <div className={styles.actions}>
          <button type="button" className={styles.act} aria-label={`Изменить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>✏️</button>
          <button type="button" className={styles.act} aria-label={`Удалить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}>🗑</button>
        </div>
        <div className={styles.name}>{place.name}</div>
        {place.desc && <div className={styles.desc}>{place.desc}</div>}
        <div className={styles.badges}><CatBadge category={category} /><PriceBadge price={place.price} /></div>
      </div>
    </div>
  );
}
