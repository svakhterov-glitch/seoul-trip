'use client';

import { useState, type ReactNode } from 'react';
import type { Day } from '@/lib/entities';
import type { TgSuggestion, TgLinkStatus } from '@/lib/telegramInbox';
import { SUGGESTION_TAGS, tagEmoji } from '@/lib/suggestionTags';

/** Подпись категории со смайликом ('Важно' и пустая — без смайлика). */
const catLabel = (t: string) => `${tagEmoji(t)} ${t}`.trim();
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

/** Доска «Предложка»: входящие из Telegram-группы ссылки → места/покупки. */
export function SuggestionBoard({
  items, days, loading, busy = false, link, botName, connecting = false,
  processing = false, rawCount = 0, onProcess, onConnect, onAddToDay, onAddToShopping, onDismiss, onTag,
}: Props) {
  // фильтр по категории: null = все, '' = без категории, иначе конкретная категория
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  // принадлежность к категории: '' = всё, что вне списка категорий (включая пустые)
  const inCat = (i: TgSuggestion, t: string) =>
    t === '' ? !SUGGESTION_TAGS.includes(i.tag || '') : (i.tag || '') === t;
  const shown = tagFilter === null ? items : items.filter((i) => inCat(i, tagFilter));
  const count = (t: string | null) => (t === null ? items.length : items.filter((i) => inCat(i, t)).length);

  const filters: { key: string | null; label: string }[] = [
    { key: null, label: 'Все' },
    ...SUGGESTION_TAGS.map((t) => ({ key: t, label: catLabel(t) })),
    { key: '', label: 'Без категории' },
  ];

  // секции страницы — по категориям (в порядке списка), плюс «Без категории».
  const groups = [
    ...SUGGESTION_TAGS.map((c) => ({ key: c, label: catLabel(c), list: shown.filter((i) => (i.tag || '') === c) })),
    { key: '__none', label: 'Без категории', list: shown.filter((i) => !SUGGESTION_TAGS.includes(i.tag || '')) },
  ].filter((g) => g.list.length > 0);

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
        <div className={styles.filters} role="group" aria-label="Фильтр по категории">
          {filters.map((f) => (
            <button key={f.label} type="button"
              className={`${styles.filter} ${tagFilter === f.key ? styles.filterOn : ''}`}
              onClick={() => setTagFilter(f.key)}>
              {f.label}<span className={styles.fcount}>{count(f.key)}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className={styles.note} role="status">Загружаю предложку…</p>
      ) : items.length === 0 ? (
        <p className={styles.note}>Пока пусто. Кидайте ссылки в подключённую группу — они появятся здесь.</p>
      ) : shown.length === 0 ? (
        <p className={styles.note}>Нет предложений в этой категории.</p>
      ) : (
        <>
          {groups.map((g) => (
            <Group key={g.key} title={g.label} count={g.list.length}>
              {g.list.map((it) => (
                <SuggestionCard key={it.id} item={it} days={days} busy={busy} processing={processing}
                  onAddToDay={onAddToDay} onAddToShopping={onAddToShopping} onDismiss={onDismiss} onTag={onTag} />
              ))}
            </Group>
          ))}
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

function SuggestionCard({ item, days, busy, processing, onAddToDay, onAddToShopping, onDismiss, onTag }: {
  item: TgSuggestion; days: Day[]; busy: boolean; processing: boolean;
  onAddToDay: (i: TgSuggestion, d: number) => void;
  onAddToShopping: (i: TgSuggestion) => void;
  onDismiss: (i: TgSuggestion) => void;
  onTag: (i: TgSuggestion, tag: string) => void;
}) {
  const [day, setDay] = useState<number>(days[0]?.number ?? 1);
  // Место без координат после разбора — точку найти не удалось (индикатор «?»).
  // Во время разбора не показываем — точка ещё может появиться.
  const noPoint = item.kind === 'place' && !item.coords && !processing;
  return (
    <article className={styles.card}>
      {item.image
        ? <img className={styles.thumb} src={item.image} alt="" loading="lazy" />
        : <div className={styles.thumbEmpty} aria-hidden="true">{tagEmoji(item.tag || '') || (item.kind === 'shopping' ? '🛍' : '📍')}</div>}
      <div className={styles.body}>
        <div className={styles.name}>
          {item.name}
          {noPoint && <span className={styles.noPoint} title="Точку на карте найти не удалось">?</span>}
        </div>
        {item.description && <div className={styles.desc}>{item.description}</div>}
        <div className={styles.meta}>
          {item.fromUser && <span>от {item.fromUser}</span>}
          {item.url && <a className={styles.src} href={item.url} target="_blank" rel="noreferrer">ссылка ↗</a>}
          <select className={styles.tag} value={item.tag || ''} disabled={busy}
            onChange={(e) => onTag(item, e.target.value)} aria-label="Категория">
            <option value="">Без категории</option>
            {SUGGESTION_TAGS.map((t) => <option key={t} value={t}>{catLabel(t)}</option>)}
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
