'use client';

import { type MediaItem, rubricMeta } from '@/lib/media';
import { getPlaceKind } from '@/lib/entities';
import styles from './MediaTile.module.css';

interface Props {
  item: MediaItem;
  highlighted: boolean;
  busy?: boolean;
  onHover: (id: string | null) => void;
  onAdd: (item: MediaItem) => void;
  onDismiss?: (id: string) => void;
}

/** Квадратная плитка доски «Медиа»: фото/плейсхолдер, чип рубрики, эмодзи сегмента,
 *  название, выжимка и атрибуция. Наведение/тап подсвечивает метку на карте. */
export function MediaTile({ item, highlighted, busy = false, onHover, onAdd, onDismiss }: Props) {
  const rub = rubricMeta(item.rubric);
  const emoji = getPlaceKind(item.segment)?.emoji ?? '📍';
  const attribution = [item.source, item.sourceDate].filter(Boolean).join(' · ');

  return (
    <article
      className={`${styles.tile} ${highlighted ? styles.on : ''}`}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(item.id)}
    >
      {item.image
        ? <div className={styles.bg} style={{ backgroundImage: `url(${item.image})` }} />
        : <div className={styles.bg} style={{ background: rub.color }}><span className={styles.ghost} aria-hidden="true">{emoji}</span></div>}
      <div className={styles.shade} />

      <span className={styles.chip} style={{ background: rub.color }}>{rub.label}</span>
      <span className={styles.seg} aria-hidden="true">{emoji}</span>
      {onDismiss && (
        <button type="button" className={styles.dismiss} aria-label={`Убрать ${item.name} из предложений`}
          onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
          onFocus={() => onHover(item.id)} onBlur={() => onHover(null)}>×</button>
      )}

      <div className={styles.body}>
        <span className={styles.name}>{item.name}</span>
        {item.blurb && <span className={styles.blurb}>{item.blurb}</span>}
        {attribution && (
          item.sourceUrl
            ? <a
                className={styles.src} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                onFocus={() => onHover(item.id)} onBlur={() => onHover(null)}
              >по версии {attribution} ↗</a>
            : <span className={styles.src}>по версии {attribution}</span>
        )}
      </div>

      <button
        type="button" className={styles.add} disabled={busy}
        aria-label={`Добавить ${item.name} в инбокс`}
        onClick={(e) => { e.stopPropagation(); onAdd(item); }}
        onFocus={() => onHover(item.id)}
        onBlur={() => onHover(null)}
      >＋</button>
    </article>
  );
}
