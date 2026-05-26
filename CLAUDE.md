# CLAUDE.md

Гид по проекту для разработчиков и ИИ-ассистентов. Кратко: что это, как
запускать, как устроено и где что менять. Подробное видение продукта — в
`PLAN.md`.

## Что это

**TripsPlan** — веб-планировщик путешествий. Пользователь регистрируется,
создаёт поездку (страна/город + даты → каркас календаря дней) и наполняет дни
местами: вручную (ввод + точка на карте), позже — по ссылкам и через ИИ.
Готовая поездка «Сеул» — пример результата работы сервиса.

## Стек и запуск

- **Next.js 15 (App Router) + React 19 + TypeScript.** Статический экспорт
  (`output: 'export'` → каталог `out/`), без серверного рантайма.
- **Стили — CSS Modules** (`*.module.css` рядом с компонентом) + глобальный
  `app/globals.css` (CSS-переменные в `:root`). Шрифт — Manrope (`next/font`).
- **Хранение и вход — Supabase** (Auth + таблица `trips` с документом в JSONB,
  защита через RLS). Ключи — в `.env.local` (`NEXT_PUBLIC_SUPABASE_*`).
- **Карта** — [Leaflet](https://leafletjs.com/) + тайлы OpenStreetMap.
- **Тесты** — Vitest + Testing Library (jsdom).

```bash
npm run dev      # дев-сервер Next → http://localhost:3000
npm run build    # статическая сборка в out/
npm test         # прогон тестов (vitest run) — наш мини-CI
npm run lint     # next lint
```

Для запуска нужен `.env.local` с ключами Supabase (шаблон —
`.env.local.example`). Без них клиент Supabase бросит ошибку при первом вызове.

## Архитектура

Слоистая, границы между UI / данными / моделью сохраняем — чтобы менять
хранилище и подключать ИИ без переписывания.

```
app/ (страницы, 'use client') → components/ (UI) → lib/ (модель + доступ к данным)
                                                    Supabase (Auth + БД)
```

- **`lib/entities.ts` — модель.** Чистые типы (`TripDoc`, `Day`, `Place`,
  `Category`), фабрики (`createTripDoc`, `createPlace`, `createDay`) и
  **иммутабельные мутации**, возвращающие НОВЫЙ документ (`addPlaceToTrip`,
  `updatePlaceInTrip`, `removePlaceFromTrip`, `updateDay`, `updateTripMeta`,
  `addCategory`, `ensureTripDefaults`). Никакого I/O — только данные.
- **`lib/trips.ts` — доступ к данным.** Все обращения к таблице `trips` через
  Supabase: `listTrips`, `getTrip`, `createTrip`, `updateTrip`. Только этот файл
  знает про форму строк БД (`{ id, data, … }`).
- **`lib/auth.ts` / `lib/useSession.ts`** — вход/регистрация/выход и хук сессии.
- **Страницы (`app/**/page.tsx`)** держат состояние поездки в `useState`,
  применяют мутацию из `entities`, затем сохраняют через `updateTrip` и кладут
  результат обратно в состояние (паттерн: `save(next)` в планировщике).

**Правила, которые держим:**

1. **UI не ходит в Supabase напрямую** — только через `lib/trips.ts` (данные) и
   `lib/auth.ts` (вход). Смена хранилища = переписать эти файлы, не страницы.
2. **Мутации поездки иммутабельны и живут в `entities.ts`.** Компоненты их
   вызывают, но не меняют документ на месте.
3. **ИИ-генерация (когда дойдём) — за интерфейсом сервиса**, как и доступ к БД.

## Карта файлов

```
app/
  layout.tsx              — корневой layout, шрифт, метаданные
  page.tsx                — лендинг + вход/регистрация (/)
  globals.css             — глобальные стили и CSS-переменные
  app/page.tsx            — список «Мои поездки» (/app)
  app/new/page.tsx        — создание поездки (/app/new)
  app/trip/page.tsx       — планировщик поездки (/app/trip/?id=…) ← основной экран
components/
  landing/                — SiteHeader, Hero, Steps, AuthCard (экран входа)
  trips/                  — TripsHeader, TripsGrid, NewTripForm (список/создание)
  planner/                — экран поездки:
    PlannerHeader, TripCover, DayTabs, DayForm, Timeline, PlaceCard,
    PlaceForm, TripMap (Leaflet), Inbox (инбокс ссылок),
    CitySkyline (запасная обложка), badges
lib/
  entities.ts             — модель + фабрики + иммутабельные мутации
  trips.ts                — доступ к таблице trips (Supabase)
  auth.ts, useSession.ts  — вход и хук сессии
  authErrors.ts           — перевод ошибок Supabase Auth в русский текст
  validation.ts           — валидация форм (вход, новая поездка)
  placeValidation.ts      — валидация формы места
  days.ts                 — даты и каркас дней (buildDays, formatDateRange…)
  parseLink.ts            — фронтовый разбор вставленной ссылки (координаты/имя из URL карт)
  tripMeta.ts             — нормализация списка спутников
  cityCovers.ts           — реестр картинок-обложек по городам (public/covers/)
  dayColors.ts            — палитра цветов дней для карты
  skyline.ts              — детерминированный пиксель-скайлайн (запасная обложка)
  supabase/client.ts      — синглтон клиента Supabase (читает env)
supabase/                 — серверная часть (БД + Edge Functions, см. ниже)
  migrations/             — схема: таблица trips (jsonb) + RLS + триггеры
  functions/              — resolve-link, generate-itinerary, trends (Deno) — на будущее
deploy/                   — скрипты развёртывания на VPS (setup/update/cron)
legacy/                   — прежняя ванильная HTML/CSS/JS-версия (НЕ используется)
docs/superpowers/         — планы и спеки этапов миграции
PLAN.md                   — видение продукта и этапы
```

`@/*` в импортах = корень проекта (`tsconfig.json` paths).

## Модель данных (суть)

`TripDoc { id, title, country, city, startDate, endDate, lead, note,
companions[], coverImage, currency, categories[], days[], places[], inbox[] }`
— весь документ хранится в колонке `data` (JSONB) строки таблицы `trips`.

- `Day { number, date, cat, title, sub }` — `cat` ссылается на
  `categories[].key`. `buildDays` строит каркас: день 1 — `start`/«Прилёт»,
  последний — `final`/«Вылет».
- `Place { id, dayNumber, order, name, coords, time, desc, price, image, by,
  kind, note, photo, source, sourceUrl }` — `order` задаёт ручной порядок в дне
  (время — необязательная подпись). `kind` — формат из `PLACE_KINDS`. Места без
  `coords` не попадают на карту. `dayNumber` 1..N — дни; `0`/`null` — вне дней.
  `sourceUrl` — исходная ссылка, если место добавлено из инбокса (иначе `''`).
- `InboxLink { id, url, name, coords, source, createdAt }` — неразобранная
  ссылка в `inbox[]`. `addInboxLink` парсит URL (`parseLink`), `addPlaceFromInbox`
  переносит её в день как `Place` (с `source:'link'` и `sourceUrl`).
- `Category { key, label, color }` — цвет (HEX) хранится в данных, применяется
  inline (вкладки дней, бейджи, линия маршрута на карте).

## Роутинг (Next App Router)

- `/` — лендинг с формой входа/регистрации. После входа → `/app`.
- `/app` — список поездок (если пусто → редирект на `/app/new`).
- `/app/new` — создание поездки.
- `/app/trip/?id=<tripId>` — планировщик. `id` берётся из query (`useSearchParams`,
  поэтому обёрнут в `<Suspense>`).

Страницы требуют сессии: `useSession()` → при `anon` редирект на `/`.

## Соглашения

- Язык интерфейса и комментариев — **русский**.
- Визуальный язык: тёмно-синий фон + коралловый акцент, белые скруглённые
  карточки. Новые экраны — в том же стиле; применяем навыки **frontend-design**
  и **web-design-guidelines**.
- Доступность: интерактив фокусируем и работает с клавиатуры; уважать
  `prefers-reduced-motion`; `touch-action: manipulation`.
- Цвета и отступы — через CSS-переменные в `app/globals.css`.
- Каждый компонент — `.tsx` + соседний `.module.css`. Клиентские компоненты
  начинаются с `'use client'`.
- На каждую новую чистую функцию/мутацию в `lib/` — тест рядом (`*.test.ts`).

## Персистентность и вход

- Вход обязателен: данные пишутся в Supabase под `user_id` текущего
  пользователя (RLS пускает к своим строкам только владельца).
- Поездка целиком сериализуется в JSONB (`data`). Загрузка — `getTrip`,
  сохранение — `updateTrip(doc)` (перезапись всего документа).
- `ensureTripDefaults` приводит старые сохранённые поездки к актуальной форме
  (догенерирует дни, проставляет `companions`/`coverImage`) — при загрузке, если
  что-то изменилось, тихо пересохраняет.

## Грабли (уже наступали)

- **Leaflet и SSR.** `TripMap` подключается через
  `dynamic(() => import(...), { ssr: false })` — Leaflet трогает `window`.
  Не импортировать карту статически в серверный код.
- **Скрытая/перерисованная карта** требует `map.invalidateSize()`, иначе тайлы
  «серые». Карта в `out/` отдаётся статикой — следить при показе ранее скрытого.
- **`output: 'export'` + `trailingSlash: true`.** Нет серверного рантайма:
  никаких route handlers / server actions / `next/image`-оптимизации
  (`images.unoptimized`). Динамику читаем на клиенте (query, Supabase).
- **`useSearchParams` требует `<Suspense>`** при статическом экспорте — см.
  обёртку в `app/app/trip/page.tsx`.
- **Сигнатуры помощников бейджей.** Меняя `CatBadge`/`priceBadge` — проверь ВСЕ
  вызовы (`grep`), включая попап карты (`TripMap`).
- **Мутации иммутабельны.** Не мутируй `trip`/`places` на месте — используй
  функции из `entities.ts`, они возвращают новый документ; иначе React не
  перерисует и сохранение уйдёт «мимо».

## Supabase (БД + серверные функции)

- **Схема** — `supabase/migrations/*_init.sql`: таблица `trips` (jsonb `data`),
  RLS по `user_id = auth.uid()`, триггер `updated_at`, индекс по FK. Применять
  через Supabase Dashboard → SQL Editor.
- **Edge Functions** (`supabase/functions/`, Deno/TypeScript) — каркас на
  будущее (`resolve-link` — разбор ссылок, `generate-itinerary` — ИИ-маршрут,
  `trends`). Пока фронтом не используются. `npm test` их не проверяет.
- **Секреты не коммитим**: `.env.local`, `.env.production` — в `.gitignore`.
  `config.local.js` — legacy-артефакт прежней версии, в Next не используется.

## Развёртывание

Прод — VPS (`194.87.243.143`, домен **tripsplan.ru**, HTTPS, nginx отдаёт `out/`).

- `deploy/setup.next.sh` — первичная настройка сервера (Node LTS, nginx, сборка).
- `deploy/update.sh` — пуллит `origin/main` и пересобирает, только если код
  изменился; запускается по cron каждые ~2 минуты (`enable-autoupdate.sh`).
- `.env.production` на сервере (вне git) хранит ключи Supabase и переживает
  `git reset --hard`.

Итого: **пуш в `main` → авто-деплой** на сервере без ручных действий.

## Как добавить типичное

- **Поле места** — в `Place`/`PlaceInput` и `createPlace` (`entities.ts`) + в
  форму `PlaceForm.tsx` + в отрисовку `PlaceCard.tsx`/`TripMap.tsx`.
- **Переменную поездки** — в `TripDoc` и `createTripDoc` (`entities.ts`) +
  мутацию (если редактируется) + UI (`TripCover`/планировщик) + тест.
- **Новую страницу** — каталог в `app/` с `page.tsx` (`'use client'` + проверка
  сессии) + компоненты в `components/` + соседние `.module.css`.
- **Содержимое поездки «Сеул»** — это обычная поездка в БД (seed), не файл в
  коде. Прежний seed лежит в `legacy/js/model/seed.seoul.js` для справки.
```
