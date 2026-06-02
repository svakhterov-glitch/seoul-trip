'use client';

import { useState } from 'react';
import type { ShoppingItem } from '@/lib/entities';
import styles from './ShoppingList.module.css';

interface Props {
  items: ShoppingItem[];
  busy?: boolean;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Общий список покупок поездки («Что купить»): галочки + ручное добавление. */
export function ShoppingList({ items, busy = false, onAdd, onToggle, onRemove }: Props) {
  const [text, setText] = useState('');
  const done = items.filter((i) => i.done).length;

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
  }

  return (
    <section className={styles.wrap} aria-label="Список покупок">
      <div className={styles.head}>
        <span className={styles.title}>Что купить</span>
        {items.length > 0 && <span className={styles.counter}>{done} / {items.length}</span>}
      </div>

      <div className={styles.addRow}>
        <input className={styles.input} value={text} disabled={busy}
          placeholder="Добавить покупку…" maxLength={200}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <button type="button" className={styles.add} disabled={busy || !text.trim()} onClick={submit} aria-label="Добавить">＋</button>
      </div>

      {items.length === 0 ? (
        <p className={styles.note}>Пусто. Добавьте вручную или присылайте ссылки на товары в Telegram-группу.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((it) => (
            <li key={it.id} className={styles.item}>
              <label className={styles.check}>
                <input type="checkbox" checked={it.done} disabled={busy} onChange={() => onToggle(it.id)} />
                <span className={it.done ? styles.textDone : styles.text}>{it.text}</span>
              </label>
              {it.url && <a className={styles.src} href={it.url} target="_blank" rel="noreferrer">↗</a>}
              <button type="button" className={styles.remove} disabled={busy}
                onClick={() => onRemove(it.id)} aria-label="Удалить">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
