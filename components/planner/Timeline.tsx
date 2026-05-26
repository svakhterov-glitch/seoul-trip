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

interface DragState { id: string; pointerId: number; }
interface DropAt { day: number; index: number; displayIndex: number; }

export function Timeline({ trip, day, categories = [], busy = false, onAddPlace, onEditPlace, onDeletePlace, onSelectPlace, onSaveDay, onMovePlace }: Props) {
  const [editDay, setEditDay] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);
  // id места, чью «ручку» нужно сфокусировать после клавиатурного переноса.
  const [focusId, setFocusId] = useState<string | null>(null);

  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  const visibleNums = days.map((d) => d.number);
  const dndOn = !!onMovePlace;

  const wrapRef = useRef<HTMLDivElement>(null);
  // Источник правды во время жеста — ref'ы (обновляются синхронно, без задержки render).
  const dragRef = useRef<DragState | null>(null);
  const dropRef = useRef<DropAt | null>(null);

  // После перерисовки (перенос) вернуть фокус на ручку перемещённой карточки.
  useEffect(() => {
    if (!focusId) return;
    const el = wrapRef.current?.querySelector<HTMLButtonElement>(`[data-grip="${focusId}"]`);
    el?.focus();
    setFocusId(null);
  }, [focusId, trip]);

  /**
   * Куда вставить место по вертикальной координате указателя. Считаем секцию дня,
   * содержащую точку, и позицию среди карточек этого дня. `index` — для movePlace
   * (без перетаскиваемой карточки); `displayIndex` — для индикатора (со всеми).
   */
  function computeDrop(clientY: number, draggingId: string): DropAt | null {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const secs = Array.from(wrap.querySelectorAll<HTMLElement>('[data-day-sec]'));
    if (secs.length === 0) return null;
    let target = secs[0];
    for (const s of secs) {
      const r = s.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) { target = s; break; }
      if (clientY > r.bottom) target = s; // держим последнюю секцию выше указателя
    }
    const dayNum = Number(target.getAttribute('data-day-sec'));
    const cards = Array.from(target.querySelectorAll<HTMLElement>('[data-card]'));
    let index = 0;        // среди карточек без перетаскиваемой
    let displayIndex = 0; // среди всех видимых карточек
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const above = clientY > r.top + r.height / 2;
      if (!above) break;
      displayIndex += 1;
      if (c.getAttribute('data-card') !== draggingId) index += 1;
    }
    return { day: dayNum, index, displayIndex };
  }

  function onGripPointerDown(e: React.PointerEvent, id: string) {
    if (!onMovePlace) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const state = { id, pointerId: e.pointerId };
    dragRef.current = state;
    dropRef.current = null;
    setDrag(state);
    setDropAt(null);
  }
  function onGripPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const at = computeDrop(e.clientY, d.id);
    dropRef.current = at;
    setDropAt(at);
  }
  function onGripPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const at = dropRef.current;
    if (at) { onMovePlace?.(d.id, at.day, at.index); setFocusId(d.id); }
    dragRef.current = null;
    dropRef.current = null;
    setDrag(null);
    setDropAt(null);
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
        const dropHere = drag && dropAt?.day === d.number ? dropAt.displayIndex : null;
        return (
          <section key={d.number} className={styles.daySec} data-day-sec={d.number}>
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
              <div className={`${styles.empty} ${dropHere === 0 ? styles.emptyDrop : ''}`}>
                На этот день пока ничего не запланировано. Добавьте место кнопкой выше.
              </div>
            ) : (
              <div className={styles.list}>
                {places.map((p, i) => (
                  <div
                    key={p.id}
                    data-card={p.id}
                    className={`${styles.slot} ${drag?.id === p.id ? styles.dragging : ''} ${dropHere === i ? styles.dropBefore : ''} ${dropHere === places.length && i === places.length - 1 ? styles.dropAfter : ''}`}
                  >
                    {dndOn && (
                      <button
                        type="button"
                        className={styles.grip}
                        data-grip={p.id}
                        aria-label={`Переместить «${p.name}». Стрелки вверх и вниз меняют порядок и переносят между днями`}
                        title="Потяните, чтобы перенести (или стрелки ↑ ↓)"
                        onPointerDown={(e) => onGripPointerDown(e, p.id)}
                        onPointerMove={onGripPointerMove}
                        onPointerUp={onGripPointerUp}
                        onPointerCancel={onGripPointerUp}
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
