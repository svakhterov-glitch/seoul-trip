'use client';

import { type MichelinItem, distinctionMeta } from '@/lib/michelin';
import { placeMapLinks } from '@/lib/mapLinks';
import styles from './MichelinTile.module.css';

interface Props {
  item: MichelinItem;
  highlighted: boolean;
  busy?: boolean;
  onHover: (id: string | null) => void;
  onAdd: (item: MichelinItem) => void;
}

/** Карточка доски «Мишлен»: бейдж отличия (звёзды/Bib/Selected), название, кухня,
 *  ценовой ориентир, ссылка на Naver Map и кнопка добавить в инбокс. Без фото. */
export function MichelinTile({ item, highlighted, busy = false, onHover, onAdd }: Props) {
  const meta = distinctionMeta(item.distinction);
  const naver = placeMapLinks(item.name, item.coords, item.geo).naver;

  return (
    <article
      className={`${styles.tile} ${highlighted ? styles.on : ''}`}
      style={{ borderLeftColor: meta.color }}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(item.id)}
    >
      <div className={styles.head}>
        <span className={styles.badge} style={{ background: meta.color }} title={meta.label}>{meta.short}</span>
        {item.price && <span className={styles.price}>{item.price}</span>}
        {!item.coords && <span className={styles.noPin} title="Не нашли точку на карте">без точки</span>}
      </div>

      <span className={styles.name}>{item.name}</span>
      {item.cuisine && <span className={styles.cuisine}>{item.cuisine}</span>}

      <div className={styles.foot}>
        <a
          className={styles.naver} href={naver} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onFocus={() => onHover(item.id)} onBlur={() => onHover(null)}
        >Naver&nbsp;Map&nbsp;↗</a>
        <button
          type="button" className={styles.add} disabled={busy}
          aria-label={`Добавить ${item.name} в инбокс`}
          onClick={(e) => { e.stopPropagation(); onAdd(item); }}
          onFocus={() => onHover(item.id)} onBlur={() => onHover(null)}
        >＋</button>
      </div>
    </article>
  );
}
