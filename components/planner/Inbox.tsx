'use client';

import { useState } from 'react';
import { type InboxLink, type Day } from '@/lib/entities';
import styles from './Inbox.module.css';

interface Props {
  links: InboxLink[];
  days: Day[];
  busy?: boolean;
  onAddLink: (url: string) => void;
  onRemoveLink: (id: string) => void;
  onPlace: (linkId: string, dayNumber: number) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google Maps', kakao: 'Kakao', yandex: 'Яндекс.Карты', instagram: 'Instagram', other: 'Ссылка',
};

export function Inbox({ links, days, busy = false, onAddLink, onRemoveLink, onPlace }: Props) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const count = links.length;

  function add() {
    const u = url.trim();
    if (!u) return;
    onAddLink(u);
    setUrl('');
  }

  return (
    <section className={styles.wrap} aria-label="Неразобранные ссылки">
      <button type="button" className={styles.header} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.title}>
          🔗 Ссылки{count > 0 && <em className={styles.count}> · не разобрано {count}</em>}
        </span>
        <span className={styles.chev} aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={styles.body}>
          <form className={styles.addRow} onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input
              className={styles.input} type="url" inputMode="url"
              placeholder="Вставьте ссылку — Instagram, блог, Google / Яндекс / Kakao Maps"
              value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Ссылка на место"
            />
            <button type="submit" className={styles.addBtn} disabled={busy || !url.trim()} aria-label="Добавить ссылку">＋</button>
          </form>

          {count === 0 ? (
            <p className={styles.hint}>Ссылки попадут сюда «не разобранными» — потом перенесёте в нужный день.</p>
          ) : (
            <ul className={styles.list}>
              {links.map((l) => (
                <li key={l.id} className={styles.item}>
                  <div className={styles.info}>
                    <span className={styles.chip}>{SOURCE_LABEL[l.source] ?? 'Ссылка'}</span>
                    <a className={styles.name} href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
                      {l.name || l.url}
                    </a>
                  </div>
                  <div className={styles.actions}>
                    <div className={styles.dayPick}>
                      <button
                        type="button" className={styles.toDay} disabled={busy}
                        aria-haspopup="menu" aria-expanded={menuFor === l.id}
                        onClick={() => setMenuFor((m) => (m === l.id ? null : l.id))}
                      >В день ▾</button>
                      {menuFor === l.id && (
                        <ul className={styles.menu} role="menu">
                          {days.map((d) => (
                            <li key={d.number} role="none">
                              <button
                                type="button" role="menuitem" className={styles.menuItem}
                                onClick={() => { setMenuFor(null); onPlace(l.id, d.number); }}
                              >День {d.number}{d.title ? ` · ${d.title}` : ''}</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button" className={styles.del} disabled={busy}
                      aria-label={`Удалить ссылку ${l.name || l.url}`} onClick={() => onRemoveLink(l.id)}
                    >✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
