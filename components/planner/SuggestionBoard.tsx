'use client';

import { useState, type ReactNode } from 'react';
import type { Day } from '@/lib/entities';
import type { TgSuggestion, TgLinkStatus } from '@/lib/telegramInbox';
import styles from './SuggestionBoard.module.css';

interface Props {
  items: TgSuggestion[];
  days: Day[];
  loading: boolean;
  busy?: boolean;
  link: TgLinkStatus | null;       // привязка группы (null — ещё не создавали)
  botName: string;                 // @имя бота ('' если не настроено)
  connecting?: boolean;
  processing?: boolean;            // идёт разбор ссылок (фото/координаты)
  rawCount?: number;               // сколько ещё не разобрано
  onProcess: () => void;           // разобрать все ссылки/места
  onConnect: () => void;           // создать/показать код привязки
  onAddToDay: (item: TgSuggestion, dayNumber: number) => void;
  onAddToShopping: (item: TgSuggestion) => void;
  onDismiss: (item: TgSuggestion) => void;
  onTag: (item: TgSuggestion, tag: string) => void;
}

/** Доступные теги предложки. '' = «Без тегов». */
export const SUGGESTION_TAGS = ['Полина', 'Сережа', 'Важно'];

/** Цвет тега (каждый различим). '' / неизвестный — нейтральный. */
const TAG_COLORS: Record<string, string> = {
  'Полина': '#c026d3', // пурпурный
  'Сережа': '#2563eb', // синий
  'Важно': '#e8463c',  // красный (внимание)
};
export function tagColor(tag: string): string {
  return TAG_COLORS[tag] || '#8a93a8';
}

/** Доска «Предложка»: входящие из Telegram-группы ссылки → места/покупки. */
export function SuggestionBoard({
  items, days, loading, busy = false, link, botName, connecting = false,
  processing = false, rawCount = 0, onProcess, onConnect, onAddToDay, onAddToShopping, onDismiss, onTag,
}: Props) {
  // фильтр по тегу: null = все, '' = без тегов, иначе конкретный тег
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const shown = tagFilter === null ? items : items.filter((i) => (i.tag || '') === tagFilter);
  const places = shown.filter((i) => i.kind === 'place');
  const shopping = shown.filter((i) => i.kind === 'shopping');
  const count = (t: string | null) => (t === null ? items.length : items.filter((i) => (i.tag || '') === t).length);

  const filters: { key: string | null; label: string }[] = [
    { key: null, label: 'Все' },
    ...SUGGESTION_TAGS.map((t) => ({ key: t, label: t })),
    { key: '', label: 'Без тегов' },
  ];

  return (
    <section className={styles.wrap} aria-label="Предложка из Telegram">
      <div className={styles.head}>
        <span className={styles.title}>Предложка из Telegram</span>
        {items.length > 0 && (
          <button type="button" className={styles.process} onClick={onProcess} disabled={processing || rawCount === 0}>
            {processing ? '🔄 Обрабатываю ссылки…' : rawCount > 0 ? `✨ Обработать ссылки (${rawCount})` : '✅ Всё обработано'}
          </button>
        )}
      </div>

      <ConnectPanel link={link} botName={botName} connecting={connecting} onConnect={onConnect} />

      {items.length > 0 && (
        <div className={styles.filters} role="group" aria-label="Фильтр по тегу">
          {filters.map((f) => {
            const on = tagFilter === f.key;
            const c = f.key ? tagColor(f.key) : '';
            return (
              <button key={f.label} type="button"
                className={`${styles.filter} ${on ? styles.filterOn : ''}`}
                style={on && c ? { background: c, borderColor: c, color: '#fff' } : (c ? { borderColor: c, color: c } : undefined)}
                onClick={() => setTagFilter(f.key)}>
                {f.label}<span className={styles.fcount}>{count(f.key)}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className={styles.note} role="status">Загружаю предложку…</p>
      ) : items.length === 0 ? (
        <p className={styles.note}>Пока пусто. Кидайте ссылки в подключённую группу — они появятся здесь.</p>
      ) : shown.length === 0 ? (
        <p className={styles.note}>Нет предложений с этим тегом.</p>
      ) : (
        <>
          {places.length > 0 && (
            <Group title="Места" count={places.length}>
              {places.map((it) => (
                <SuggestionCard key={it.id} item={it} days={days} busy={busy}
                  onAddToDay={onAddToDay} onAddToShopping={onAddToShopping} onDismiss={onDismiss} onTag={onTag} />
              ))}
            </Group>
          )}
          {shopping.length > 0 && (
            <Group title="Покупки" count={shopping.length}>
              {shopping.map((it) => (
                <SuggestionCard key={it.id} item={it} days={days} busy={busy}
                  onAddToDay={onAddToDay} onAddToShopping={onAddToShopping} onDismiss={onDismiss} onTag={onTag} />
              ))}
            </Group>
          )}
        </>
      )}
    </section>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{title} <span className={styles.groupCount}>{count}</span></h3>
      <div className={styles.grid}>{children}</div>
    </div>
  );
}

function SuggestionCard({ item, days, busy, onAddToDay, onAddToShopping, onDismiss, onTag }: {
  item: TgSuggestion; days: Day[]; busy: boolean;
  onAddToDay: (i: TgSuggestion, d: number) => void;
  onAddToShopping: (i: TgSuggestion) => void;
  onDismiss: (i: TgSuggestion) => void;
  onTag: (i: TgSuggestion, tag: string) => void;
}) {
  const [day, setDay] = useState<number>(days[0]?.number ?? 1);
  return (
    <article className={styles.card}>
      {item.image
        ? <img className={styles.thumb} src={item.image} alt="" loading="lazy" />
        : <div className={styles.thumbEmpty} aria-hidden="true">{item.kind === 'shopping' ? '🛍' : '📍'}</div>}
      <div className={styles.body}>
        <div className={styles.name}>
          {item.tag && <span className={styles.dot} style={{ background: tagColor(item.tag) }} aria-hidden="true" />}
          {item.name}
        </div>
        {item.description && <div className={styles.desc}>{item.description}</div>}
        <div className={styles.meta}>
          {item.fromUser && <span>от {item.fromUser}</span>}
          {item.url && <a className={styles.src} href={item.url} target="_blank" rel="noreferrer">ссылка ↗</a>}
          <select className={styles.tag} value={item.tag || ''} disabled={busy}
            style={item.tag ? { borderColor: tagColor(item.tag), color: tagColor(item.tag) } : undefined}
            onChange={(e) => onTag(item, e.target.value)} aria-label="Тег">
            <option value="">Без тегов</option>
            {SUGGESTION_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.actions}>
          <span className={styles.dayPick}>
            <select className={styles.select} value={day} disabled={busy}
              onChange={(e) => setDay(Number(e.target.value))} aria-label="День">
              {days.map((d) => <option key={d.number} value={d.number}>День {d.number}</option>)}
            </select>
            <button type="button" className={styles.btn} disabled={busy}
              onClick={() => onAddToDay(item, day)}>📍 В день</button>
          </span>
          <button type="button" className={styles.btn} disabled={busy}
            onClick={() => onAddToShopping(item)}>🛍 В покупки</button>
          <button type="button" className={styles.dismiss} disabled={busy}
            onClick={() => onDismiss(item)} aria-label="Убрать">✕</button>
        </div>
      </div>
    </article>
  );
}

function ConnectPanel({ link, botName, connecting, onConnect }: {
  link: TgLinkStatus | null; botName: string; connecting: boolean; onConnect: () => void;
}) {
  if (!link) {
    return (
      <div className={styles.connect}>
        <span className={styles.connectText}>Подключите Telegram-группу — бот будет складывать сюда ссылки из чата.</span>
        <button type="button" className={styles.connectBtn} onClick={onConnect} disabled={connecting}>
          {connecting ? 'Готовлю код…' : 'Подключить Telegram'}
        </button>
      </div>
    );
  }
  if (link.connected) {
    return <div className={`${styles.connect} ${styles.connectOk}`}>✅ Группа подключена. Кидайте ссылки в чат — они появятся здесь.</div>;
  }
  return (
    <div className={styles.connect}>
      <div className={styles.steps}>
        <div>1. Добавьте бота {botName ? <b>{botName}</b> : 'в группу'} в вашу Telegram-группу.</div>
        <div>2. Отправьте в группе команду:</div>
        <code className={styles.code}>/connect {link.code}</code>
        <div className={styles.hint}>После этого сообщения со ссылками начнут попадать в предложку. Обновите страницу, чтобы увидеть статус «подключено».</div>
      </div>
    </div>
  );
}
