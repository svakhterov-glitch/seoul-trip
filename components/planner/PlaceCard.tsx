'use client';

import { useState } from 'react';
import { type Place, type Category, getPlaceKind } from '@/lib/entities';
import { placeMapLinks } from '@/lib/mapLinks';
import { PriceBadge, KindBadge, PersonBadge } from './badges';
import styles from './PlaceCard.module.css';

interface Props {
  place: Place;
  category: Category | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onAddChecklist?: (placeId: string, text: string) => void;
  onToggleChecklist?: (placeId: string, itemId: string) => void;
  onRemoveChecklist?: (placeId: string, itemId: string) => void;
  onSuggestChecklist?: (place: Place) => Promise<string[]>;
}

export function PlaceCard({ place, category, onSelect, onEdit, onDelete, onToggleLock, onAddChecklist, onToggleChecklist, onRemoveChecklist, onSuggestChecklist }: Props) {
  const emoji = getPlaceKind(place.kind)?.emoji || place.photo || '📍';
  const stripe = category?.color || '#cbd2e6';
  const maps = placeMapLinks(place.name, place.coords, place.geo);
  const checklist = place.checklist ?? [];
  const [newItem, setNewItem] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function addItem() {
    const t = newItem.trim();
    if (!t || !onAddChecklist) return;
    onAddChecklist(place.id, t);
    setNewItem('');
  }

  async function suggest() {
    if (!onSuggestChecklist || suggesting) return;
    setSuggesting(true);
    try {
      const items = await onSuggestChecklist(place);
      const have = new Set(checklist.map((i) => i.text.toLowerCase()));
      const fresh = items.filter((t) => !have.has(t.toLowerCase()));
      setSuggestions(fresh);
      if (items.length && !fresh.length) setSuggestions([]); // всё уже есть
    } finally {
      setSuggesting(false);
    }
  }

  function acceptSuggestion(text: string) {
    onAddChecklist?.(place.id, text);
    setSuggestions((s) => s.filter((x) => x !== text));
  }
  const hasBadges = !!place.kind || (place.price !== null && place.price !== undefined) || !!place.by;

  return (
    <div className={styles.item} role="button" tabIndex={0}
      aria-label={`${place.time ? place.time + ', ' : ''}${place.name}`}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(place.id); } }}>
      <div className={styles.rail}>
        {place.coords
          ? (place.time && <span className={styles.time}>{place.time}</span>)
          : <span className={styles.noPoint} title="Точка не найдена — откройте место и поставьте точку на карте">?</span>}
      </div>
      <div className={styles.card} style={{ '--stripe': stripe } as React.CSSProperties}>
        <div className={styles.actions}>
          {onToggleLock && (
            <button type="button" className={`${styles.act} ${place.locked ? styles.actOn : ''}`}
              aria-label={place.locked ? `Снять замок с ${place.name}` : `Закрепить ${place.name} (защита от очистки/удаления)`}
              aria-pressed={place.locked}
              onClick={(e) => { e.stopPropagation(); onToggleLock(place.id); }}>
              {place.locked ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
            </button>
          )}
          <button type="button" className={styles.act} aria-label={`Изменить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          {!place.locked && (
            <button type="button" className={styles.act} aria-label={`Удалить ${place.name}`}
              onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.row}>
          {place.image
            ? <img className={styles.thumb} src={place.image} alt={place.name} loading="lazy" />
            : <div className={styles.thumbEmoji} aria-hidden="true">{emoji}</div>}
          <div className={styles.main}>
            <div className={styles.name}>{place.name}</div>
            {place.desc && <div className={styles.desc}>{place.desc}</div>}
            {place.seasonNote && <div className={styles.season}>🗓 {place.seasonNote}</div>}
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
            <div className={styles.maps}>
              <span className={styles.mapsLabel}>На карте:</span>
              <a className={styles.mapLink} href={maps.kakao} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>Kakao</a>
              <a className={styles.mapLink} href={maps.naver} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>Naver</a>
              <a className={styles.mapLink} href={maps.google} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>Google</a>
            </div>
            {onAddChecklist && (
              <div className={styles.checklist} onClick={(e) => e.stopPropagation()}>
                <div className={styles.clHead}>
                  <span className={styles.clTitle}>✓ Чеклист — что посмотреть / купить</span>
                  {onSuggestChecklist && (
                    <button type="button" className={styles.clSuggest} onClick={suggest} disabled={suggesting}>
                      {suggesting ? '✨ Думаю…' : '✨ Предложить'}
                    </button>
                  )}
                </div>
                {suggestions.length > 0 && (
                  <ul className={styles.clSug}>
                    {suggestions.map((t) => (
                      <li key={t} className={styles.clSugItem}>
                        <button type="button" className={styles.clSugAdd} onClick={() => acceptSuggestion(t)}>＋</button>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {checklist.length > 0 && (
                  <ul className={styles.clList}>
                    {checklist.map((it) => (
                      <li key={it.id} className={styles.clItem}>
                        <label className={`${styles.clLabel} ${it.done ? styles.clDone : ''}`}>
                          <input type="checkbox" checked={it.done}
                            onChange={() => onToggleChecklist?.(place.id, it.id)} />
                          <span>{it.text}</span>
                        </label>
                        <button type="button" className={styles.clDel} aria-label={`Удалить пункт «${it.text}»`}
                          onClick={() => onRemoveChecklist?.(place.id, it.id)}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.clAdd}>
                  <input className={styles.clInput} value={newItem} placeholder="Добавить пункт…"
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                  <button type="button" className={styles.clAddBtn} onClick={addItem} disabled={!newItem.trim()}>＋</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
