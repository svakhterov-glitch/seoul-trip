'use client';

import { useCallback, useRef, useState } from 'react';
import type { Day } from '@/lib/entities';
import styles from './DayReorder.module.css';

interface Props {
  days: Day[];                 // все дни (по порядку слотов)
  reorderable: number[];       // номера «средних» дней (которые можно двигать)
  busy?: boolean;
  onApply: (order: number[]) => void; // новый порядок средних дней
  onClose: () => void;
}

/** Попап «Порядок дней»: drag-and-drop средних дней (первый/последний закреплены). */
export function DayReorder({ days, reorderable, busy = false, onApply, onClose }: Props) {
  const byNum = new Map(days.map((d) => [d.number, d]));
  const first = days[0];
  const last = days[days.length - 1];
  const [order, setOrder] = useState<number[]>(reorderable);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const dragRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const onMove = useCallback((e: PointerEvent) => {
    const y = e.clientY;
    let idx = rowRefs.current.length;
    for (let k = 0; k < rowRefs.current.length; k++) {
      const el = rowRefs.current[k];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) { idx = k; break; }
    }
    overRef.current = idx;
    setOverIdx(idx);
  }, []);

  const onUp = useCallback(() => {
    window.removeEventListener('pointermove', onMove);
    const from = dragRef.current;
    const over = overRef.current;
    if (from != null && over != null) {
      setOrder((cur) => {
        const arr = [...cur];
        const [m] = arr.splice(from, 1);
        let to = over > from ? over - 1 : over;
        to = Math.max(0, Math.min(arr.length, to));
        arr.splice(to, 0, m);
        return arr;
      });
    }
    dragRef.current = null; overRef.current = null;
    setDragIdx(null); setOverIdx(null);
  }, [onMove]);

  function startDrag(e: React.PointerEvent, i: number) {
    if (e.button && e.button !== 0) return;
    dragRef.current = i; overRef.current = i;
    setDragIdx(i); setOverIdx(i);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  const changed = order.some((n, i) => n !== reorderable[i]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Порядок дней">
        <div className={styles.head}>
          <span className={styles.title}>Порядок дней</span>
          <button type="button" className={styles.x} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <p className={styles.hint}>Перетащите дни за ручку, чтобы поменять порядок. Даты остаются на месте — переезжает содержание дня и его места. Прилёт и вылет закреплены.</p>

        {first && <Row d={first} locked />}

        <ul className={styles.list}>
          {order.map((num, i) => {
            const d = byNum.get(num);
            if (!d) return null;
            return (
              <li
                key={num}
                ref={(el) => { rowRefs.current[i] = el; }}
                className={`${styles.row} ${dragIdx === i ? styles.dragging : ''} ${overIdx === i && dragIdx !== null ? styles.over : ''}`}
              >
                <button type="button" className={styles.handle} aria-label={`Перетащить день ${d.number}`}
                  onPointerDown={(e) => startDrag(e, i)}>⠿</button>
                <span className={styles.pos}>{i + 2}</span>
                <span className={styles.info}>
                  <span className={styles.dname}>{d.title || `День ${d.number}`}</span>
                  <span className={styles.dmeta}>было: День {d.number} · {d.date}</span>
                </span>
              </li>
            );
          })}
          {dragIdx !== null && overIdx === order.length && <li className={styles.dropEnd} aria-hidden />}
        </ul>

        {last && <Row d={last} locked />}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.apply} disabled={busy || !changed}
            onClick={() => { onApply(order); onClose(); }}>Готово</button>
        </div>
      </div>
    </div>
  );
}

function Row({ d, locked }: { d: Day; locked?: boolean }) {
  return (
    <div className={`${styles.row} ${styles.locked}`}>
      <span className={styles.handle} aria-hidden>🔒</span>
      <span className={styles.pos}>{d.number}</span>
      <span className={styles.info}>
        <span className={styles.dname}>{d.title || `День ${d.number}`}</span>
        <span className={styles.dmeta}>День {d.number} · {d.date}{locked ? ' · закреплён' : ''}</span>
      </span>
    </div>
  );
}
