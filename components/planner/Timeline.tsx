'use client';

import { useEffect, useRef, useState } from 'react';
import { type TripDoc, type Category, getCategory, placesForDay } from '@/lib/entities';
import { PlaceCard } from './PlaceCard';
import { CatBadge } from './badges';
import { DayForm, type DaySave } from './DayForm';
import styles from './Timeline.module.css';

interface Props {
  trip: TripDoc;
  day: number; // 0 = весь маршрут
  categories?: Category[];
  busy?: boolean;
  onAddPlace: (dayNumber: number) => void;
  onEditPlace: (id: string) => void;
  onDeletePlace: (id: string) => void;
  onSelectPlace: (id: string) => void;
  onSaveDay?: (dayNumber: number, patch: DaySave) => void;
  /** Перенос места: внутри дня (порядок) или в другой день. */
  onMovePlace?: (placeId: string, targetDay: number, targetIndex: number) => void;
}

interface DropAt { day: number; index: number; }

export function Timeline({ trip, day, categories = [], busy = false, onAddPlace, onEditPlace, onDeletePlace, onSelectPlace, onSaveDay, onMovePlace }: Props) {
  const [editDay, setEditDay] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);
  // id места, чью «ручку» нужно сфокусировать после клавиатурного переноса.
  const [focusId, setFocusId] = useState<string | null>(null);

  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  const visibleNums = days.map((d) => d.number);
  const dndOn = !!onMovePlace;

  // После перерисовки (перенос) вернуть фокус на ручку перемещённой карточки.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusId) return;
    const el = wrapRef.current?.querySelector<HTMLButtonElement>(`[data-grip="${focusId}"]`);
    el?.focus();
    setFocusId(null);
  }, [focusId, trip]);

  function endDrag() { setDragId(null); setDropAt(null); }

  function drop() {
    if (dragId && dropAt) { onMovePlace?.(dragId, dropAt.day, dropAt.index); setFocusId(dragId); }
    endDrag();
  }

  // Клавиатурный перенос: на границе дня уходим в соседний видимый день.
  function moveByKey(placeId: string, dayNumber: number, index: number, dir: -1 | 1) {
    if (!onMovePlace) return;
    const len = placesForDay(trip, dayNumber).length;
    const di = visibleNums.indexOf(dayNumber);
    if (dir === -1) {
      if (index > 0) onMovePlace(placeId, dayNumber, index - 1);
      else if (di > 0) { const prev = visibleNums[di - 1]; onMovePlace(placeId, prev, placesForDay(trip, prev).length); }
      else return;
    } else {
      if (index < len - 1) onMovePlace(placeId, dayNumber, index + 1);
      else if (di >= 0 && di < visibleNums.length - 1) onMovePlace(placeId, visibleNums[di + 1], 0);
      else return;
    }
    setFocusId(placeId);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {days.length === 0 && <div className={styles.empty}>Дни поездки ещё не сформированы.</div>}
      {days.map((d) => {
        const places = placesForDay(trip, d.number);
        const cat = getCategory(trip, d.cat);
        const dropHere = dropAt?.day === d.number ? dropAt.index : null;
        return (
          <section key={d.number} className={styles.daySec}>
            {editDay === d.number ? (
              <DayForm day={d} categories={categories} busy={busy}
                onSave={(patch) => { onSaveDay?.(d.number, patch); setEditDay(null); }}
                onCancel={() => setEditDay(null)} />
            ) : (
              <div className={styles.head}>
                <div className={styles.headTop}>
                  <span className={styles.dlabel}>День {d.number} · {d.date}</span>
                  <div className={styles.headActions}>
                    {onSaveDay && (
                      <button type="button" className={styles.editDay} onClick={() => setEditDay(d.number)}>Изменить день</button>
                    )}
                    <button type="button" className={styles.add} onClick={() => onAddPlace(d.number)}>＋ Добавить место</button>
                  </div>
                </div>
                <div className={styles.titleRow}>
                  <h3 className={styles.dtitle}>{d.title}</h3>
                  {cat && <CatBadge category={cat} />}
                </div>
              </div>
            )}
            {places.length === 0 ? (
              <div
                className={`${styles.empty} ${dndOn && dragId && dropHere === 0 ? styles.emptyDrop : ''}`}
                onDragOver={dndOn ? (e) => { if (dragId) { e.preventDefault(); setDropAt({ day: d.number, index: 0 }); } } : undefined}
                onDrop={dndOn ? (e) => { e.preventDefault(); drop(); } : undefined}
              >На этот день пока ничего не запланировано. Добавьте место кнопкой выше.</div>
            ) : (
              <div className={styles.list}>
                {places.map((p, i) => (
                  <div
                    key={p.id}
                    className={`${styles.slot} ${dragId === p.id ? styles.dragging : ''} ${dropHere === i ? styles.dropBefore : ''} ${dropHere === i + 1 && i === places.length - 1 ? styles.dropAfter : ''}`}
                    onDragOver={dndOn ? (e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      const after = e.clientY - r.top > r.height / 2;
                      setDropAt({ day: d.number, index: after ? i + 1 : i });
                    } : undefined}
                    onDrop={dndOn ? (e) => { e.preventDefault(); drop(); } : undefined}
                  >
                    {dndOn && (
                      <button
                        type="button"
                        className={styles.grip}
                        data-grip={p.id}
                        draggable
                        aria-label={`Переместить «${p.name}». Стрелки вверх и вниз меняют порядок и переносят между днями`}
                        title="Перетащите или используйте стрелки ↑ ↓"
                        onDragStart={(e) => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); }}
                        onDragEnd={endDrag}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') { e.preventDefault(); moveByKey(p.id, d.number, i, -1); }
                          else if (e.key === 'ArrowDown') { e.preventDefault(); moveByKey(p.id, d.number, i, 1); }
                        }}
                      >
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
                          <circle cx="4" cy="3" r="1.4" /><circle cx="10" cy="3" r="1.4" />
                          <circle cx="4" cy="8" r="1.4" /><circle cx="10" cy="8" r="1.4" />
                          <circle cx="4" cy="13" r="1.4" /><circle cx="10" cy="13" r="1.4" />
                        </svg>
                      </button>
                    )}
                    <div className={styles.cardWrap}>
                      <PlaceCard place={p} category={cat}
                        onSelect={onSelectPlace} onEdit={onEditPlace} onDelete={onDeletePlace} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
