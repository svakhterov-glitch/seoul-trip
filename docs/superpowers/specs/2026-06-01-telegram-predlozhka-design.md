# Telegram-предложка и список покупок — дизайн

Дата: 2026-06-01. Статус: согласовано с пользователем.

## Цель

Бот в Telegram-группе ловит сообщения **со ссылками**, разбирает их и кладёт в
**предложку** поездки (новая вкладка рядом с «Медиа»). Пользователь одобряет:
место → уходит в день; товар (Oliveyoung и пр.) → в общий **список покупок**
поездки.

## Решения (с пользователем)

- **Источник** — общий чат с друзьями (бот в группе, privacy mode OFF). Берём
  только сообщения, содержащие URL (чтобы не тащить болтовню).
- **Покупки** — новый общий раздел поездки **«Что купить»** (`TripDoc.shopping`),
  не привязан к месту; галочки как в чеклисте.
- **Предложка** — отдельная вкладка-доска «✨ Предложка» (сентинел вкладки рядом
  с `MEDIA_TAB`).
- **Хранение входящих — отдельная таблица Supabase** (`tg_suggestions`), НЕ в
  документе поездки: бот пишет асинхронно (приложение может быть закрыто), а
  браузер перезаписывает весь JSONB документа — затирал бы входящие.

## Архитектура / поток данных

```
Telegram-группа → Bot API → webhook (edge: telegram-webhook)
  ├─ фильтр: сообщение должно содержать ссылку
  ├─ resolve-link (переиспользуем): name/desc/image/coords
  ├─ классификация place|shopping по домену ссылки
  └─ INSERT в tg_suggestions (trip_id из tg_links по chat_id)

Приложение (планировщик):
  читает tg_suggestions своей поездки → вкладка «Предложка»
  одобрение:
    place    → addPlaceFromInbox-подобный перенос в день (Place, source:'tg')
    shopping → добавление в TripDoc.shopping
  обработанное помечается status='added' / удаляется
```

### Классификация place vs shopping

- Домены покупок: `oliveyoung.` (co.kr/.com/global), `coupang.`, `gmarket.`,
  `musinsa.`, `smartstore.naver.`, `kreamapp`/`kream.`, и т.п. → `shopping`.
- Карты/соцсети/блоги (kakao/naver/google maps, instagram, tistory, blog) →
  `place`. По умолчанию (нет совпадений) → `place`.
- Пользователь может переключить тип прямо в предложке.

## Привязка группы к поездке

- В приложении кнопка **«Подключить Telegram»**: создаёт запись в `tg_links`
  (`code`, `trip_id`, `user_id`, `chat_id` = null) и показывает имя бота + код.
- В группе участник пишет `/connect <code>` → webhook находит код, проставляет
  `chat_id` группы. С этого момента входящие из этого чата → в эту поездку.
- Статус подключения виден в приложении (по наличию `chat_id`).

## Модель данных

### Frontend (`lib/entities.ts`)
- `ShoppingItem { id: string; text: string; url: string; done: boolean; source: string }`
- `TripDoc.shopping: ShoppingItem[]` (+ `ensureTripDefaults` догенерирует `[]`).
- Мутации: `addShoppingItem(trip, {text,url,source})`, `toggleShoppingItem(trip,id)`,
  `removeShoppingItem(trip,id)` — иммутабельно; тесты рядом.
- `Place` получает `source:'tg'` для перенесённых из предложки (опционально).

### Supabase (новая миграция)
```sql
create table tg_links (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null,
  chat_id text,                       -- проставляется ботом при /connect
  created_at timestamptz default now()
);
create table tg_suggestions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  chat_id text not null,
  kind text not null default 'place', -- 'place' | 'shopping'
  url text,
  name text,
  description text,
  image text,
  coords jsonb,                       -- [lat,lng] | null
  from_user text,                     -- имя отправителя
  raw_text text,
  status text not null default 'new', -- 'new' | 'added' | 'dismissed'
  created_at timestamptz default now()
);
-- RLS: владелец поездки (trips.user_id = auth.uid()) читает/меняет свои строки.
-- Запись делает webhook сервис-ролью (минует RLS).
```

### Сервисы (`lib/`)
- `lib/telegramInbox.ts` — `listSuggestions(tripId)`, `markSuggestion(id,status)`,
  `createLink(tripId)` (код), `linkStatus(tripId)`.
- Только этот файл знает форму таблиц tg_*.

### Edge-функция `telegram-webhook` (Deno)
- Вебхук Telegram (секрет в пути/заголовке `X-Telegram-Bot-Api-Secret-Token`).
- `/connect <code>`: bind chat_id → tg_links.
- Сообщение с URL: resolve-link → классификация → insert в tg_suggestions.
- Секреты: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, доступ к БД
  (SERVICE_ROLE_KEY).

## UI
- `DayTabs`: добавить сентинел `INBOX_TAB` (= -2) «✨ Предложка».
- `components/planner/SuggestionBoard.tsx` — две секции (Места / Покупки),
  карточки с «В день» / «В список покупок» / «Убрать».
- `components/planner/ShoppingList.tsx` — раздел «🛍 Что купить» (галочки,
  добавить вручную, удалить); показывается в настройках или отдельной секцией.
- `TripSettings` (или обложка): кнопка «Подключить Telegram» + статус.

## Этапы сборки
1. Модель `shopping` + мутации + тесты (frontend, самодостаточно).
2. Миграция БД (`tg_links`, `tg_suggestions`, RLS) — применяет пользователь в SQL Editor.
3. `lib/telegramInbox.ts` + edge `telegram-webhook` + классификация.
4. UI: вкладка «Предложка», раздел «Что купить», кнопка «Подключить Telegram».
5. Go-live: пользователь создаёт бота (@BotFather), privacy OFF, даёт токен →
   деплой функции + установка вебхука.

## От пользователя (операционно)
- Бот у @BotFather: токен (→ секрет Supabase), `/setprivacy → Disable`.
- Применить миграцию в Supabase SQL Editor.
- Свежий Supabase access token для деплоя функции (отозвать после).
