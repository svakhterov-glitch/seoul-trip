'use client';

import { useState } from 'react';
import { type InboxLink, type Day } from '@/lib/entities';
import { type PlaceCandidate } from '@/lib/searchPlaces';
import styles from './Inbox.module.css';

/** Состояние поиска по названию (живёт в планировщике, сюда приходит готовым). */
export interface SearchState {
  query: string;
  status: 'loading' | 'done';
  candidates: PlaceCandidate[];
}

interface Props {
  links: InboxLink[];
  days: Day[];
  busy?: boolean;
  resolving?: string[]; // id ссылок, которые сейчас разбираются на сервере
  search?: SearchState | null; // активный поиск по названию (кандидаты для выбора)
  onAdd: (text: string) => void; // ссылка ИЛИ название места — разбирает планировщик
  onRemoveLink: (id: string) => void;
  onPlace: (linkId: string, dayNumber: number) => void;
  onPickCandidate: (c: PlaceCandidate) => void; // выбрать место из найденных
  onAddRaw: () => void;        // добавить запрос как есть (без карты)
  onDismissSearch: () => void; // закрыть панель поиска
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google Maps', kakao: 'Kakao', yandex: 'Яндекс.Карты', instagram: 'Instagram',
  search: 'Поиск', media: 'Медиа', other: 'Ссылка',
};

export function Inbox({
  links, days, busy = false, resolving = [], search = null,
  onAdd, onRemoveLink, onPlace, onPickCandidate, onAddRaw, onDismissSearch,
}: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const count = links.length;
  const searching = search?.status === 'loading';

  function add() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
  }

  return (
    <section className={styles.wrap} aria-label="Места и ссылки">
      <button type="button" className={styles.header} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.title}>
          Места и ссылки{count > 0 && <em className={styles.count}> · не разобрано {count}</em>}
        </span>
        <span className={styles.chev} aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={styles.body}>
          <form className={styles.addRow} onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input
              className={styles.input} type="text"
              placeholder="Название места или ссылка — Google / Яндекс / Kakao Maps, Instagram, блог"
              value={text} onChange={(e) => setText(e.target.value)} aria-label="Название места или ссылка"
            />
            <button type="submit" className={styles.addBtn} disabled={busy || searching || !text.trim()} aria-label="Найти или добавить">
              {searching ? '…' : '＋'}
            </button>
          </form>

          {search && (
            <div className={styles.search} role="region" aria-label="Результаты поиска места">
              {search.status === 'loading' ? (
                <p className={styles.searchHint} role="status">Ищу «{search.query}» в городе…</p>
              ) : search.candidates.length === 0 ? (
                <div className={styles.searchEmpty}>
                  <span className={styles.searchHint}>Ничего не нашлось по «{search.query}».</span>
                  <div className={styles.searchBtns}>
                    <button type="button" className={styles.rawBtn} onClick={onAddRaw} disabled={busy}>Добавить без карты</button>
                    <button type="button" className={styles.dismiss} onClick={onDismissSearch}>Отмена</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.searchTop}>
                    <span className={styles.searchHint}>Выберите место — «{search.query}»:</span>
                    <button type="button" className={styles.dismiss} onClick={onDismissSearch}>Отмена</button>
                  </div>
                  <ul className={styles.candidates}>
                    {search.candidates.map((c, i) => (
                      <li key={`${c.name}_${i}`} className={styles.candidate}>
                        <span className={styles.candIcon} aria-hidden="true">📍</span>
                        <div className={styles.candText}>
                          <span className={styles.candName}>{c.name}</span>
                          {c.desc && <span className={styles.candDesc}>{c.desc}</span>}
                          {c.address && <span className={styles.candAddr}>{c.address}</span>}
                        </div>
                        <button type="button" className={styles.candAdd} disabled={busy} onClick={() => onPickCandidate(c)}>＋</button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {count === 0 ? (
            <p className={styles.hint}>Найдите место по названию или вставьте ссылку — попадёт сюда «не разобранным», потом перенесёте в нужный день.</p>
          ) : (
            <ul className={styles.list}>
              {links.map((l) => {
                const isResolving = resolving.includes(l.id);
                return (
                <li key={l.id} className={styles.item}>
                  <div className={styles.info}>
                    {l.image && <img className={styles.thumb} src={l.image} alt="" loading="lazy" />}
                    <div className={styles.text}>
                      <div className={styles.line}>
                        <span className={styles.chip}>{SOURCE_LABEL[l.source] ?? 'Ссылка'}</span>
                        {l.coords && <span className={styles.located} title="Место найдено на карте">📍</span>}
                        {l.url ? (
                          <a className={styles.name} href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
                            {l.name || l.url}
                          </a>
                        ) : (
                          <span className={styles.name} title={l.name}>{l.name}</span>
                        )}
                        {isResolving && <span className={styles.resolving} role="status">разбираю…</span>}
                      </div>
                      {l.desc && <p className={styles.desc}>{l.desc}</p>}
                    </div>
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
                      aria-label={`Удалить ${l.name || l.url}`} onClick={() => onRemoveLink(l.id)}
                    >✕</button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
