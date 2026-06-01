# CLAUDE.md

Гид по проекту для разработчиков и ИИ-ассистентов. Кратко: что это, как
запускать, как устроено и где что менять. Подробное видение продукта — в
`PLAN.md`.

## Что это

**TripsPlan** — веб-планировщик путешествий. Пользователь регистрируется,
создаёт поездку (страна/город + даты → каркас календаря дней) и наполняет дни
местами: вручную (ввод + точка на карте), по ссылкам (инбокс + серверный
разбор с фото/описанием), поиском по названию в пределах города (ИИ + геокодер
предлагают кандидатов, пользователь выбирает) и **ИИ-сборкой маршрута** (живой
веб-поиск по медиа/тревел-блогерам под город и даты, проверка актуальности и
сезона, кластеризация по районам и раскладка по дням). Готовая поездка «Сеул» —
пример результата работы сервиса.

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
3. **Сеть/ИИ — за интерфейсом сервиса**, как и доступ к БД. Реализовано:
   `lib/resolveLink.ts`, `lib/searchPlaces.ts`, `lib/generateItinerary.ts`,
   `lib/mediaBoard.ts` — UI зовёт их, а не `supabase.functions` напрямую.

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
    AiItinerary (форма ИИ-сборки: темп/интересы/статус),
    MediaBoard/MediaTile (витрина «Медиа»),
    CitySkyline (запасная обложка), badges
lib/
  entities.ts             — модель + фабрики + иммутабельные мутации
  trips.ts                — доступ к таблице trips (Supabase)
  auth.ts, useSession.ts  — вход и хук сессии
  authErrors.ts           — перевод ошибок Supabase Auth в русский текст
  validation.ts           — валидация форм (вход, новая поездка)
  placeValidation.ts      — валидация формы места
  days.ts                 — даты и каркас дней (buildDays, formatDateRange…)
  parseLink.ts            — фронтовый разбор ссылки + isLink (ссылка vs поисковый запрос)
  resolveLink.ts          — сервис серверного разбора ссылки (зовёт edge-функцию resolve-link)
  searchPlaces.ts         — сервис поиска места по названию (edge-функция search-places) + placeMapsUrl
  generateItinerary.ts    — сервис ИИ-маршрута: зовёт generate-itinerary + geocode и склеивает; cleanItineraryText (чистит HTML-мусор)
  mediaBoard.ts, media.ts, mediaDemo.ts — доска «Медиа» (сервис + типы + демо-фикстуры)
  tripMeta.ts             — нормализация списка спутников
  cityCovers.ts           — реестр картинок-обложек по городам (public/covers/)
  dayColors.ts            — палитра цветов дней для карты
  skyline.ts              — детерминированный пиксель-скайлайн (запасная обложка)
  supabase/client.ts      — синглтон клиента Supabase (читает env)
supabase/                 — серверная часть (БД + Edge Functions, см. ниже)
  migrations/             — схема: таблица trips (jsonb) + RLS + триггеры
  functions/              — все ЗАДЕПЛОЕНЫ (Deno): resolve-link, search-places, generate-itinerary, geocode, trends
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
  kind, note, photo, source, sourceUrl, sourceDate, seasonNote, district }` —
  `order` задаёт ручной порядок в дне (время — необязательная подпись). `kind` —
  формат из `PLACE_KINDS`. Места без `coords` не попадают на карту. `dayNumber`
  1..N — дни; `0`/`null` — вне дней. `sourceUrl` — исходная ссылка, если место
  добавлено из инбокса (иначе `''`). `source:'ai'` + `sourceDate`/`seasonNote`/
  `district` заполняет ИИ-маршрут (дата упоминания, сезон-пометка под даты,
  район для группировки) — показываются в `PlaceCard`.
- `InboxLink { id, url, name, coords, desc, image, source, createdAt }` —
  запись инбокса в `inbox[]` (ссылка ИЛИ найденное по названию место).
  **Ссылка:** `addInboxLink` парсит URL фронтом (`parseLink`), затем планировщик
  асинхронно дозапрашивает сервер (`resolveLink` → edge-функция) и
  `updateInboxLink` дописывает `coords/name/desc/image`. **Поиск по названию:**
  ввод без URL (`isLink`=false) уходит в `searchPlaces` → edge-функция
  `search-places` возвращает кандидатов; пользователь выбирает один, и
  `addInboxPlace` кладёт его в инбокс уже разобранным (`source:'search'`,
  `url`=Google Maps поиск). `addPlaceFromInbox` переносит любую запись в день как
  `Place` (с `source:'link'` и `sourceUrl`); `desc/image` идут в форму места.
- `ItineraryDraft { places: ItineraryDraftPlace[] }` — результат ИИ-сборки.
  `applyItinerary(trip, draft)` пакетно добавляет места (`source:'ai'`) в свои
  дни, **дополняя** их: уже разложенные руками места не трогает, новые
  приписывает после них (продолжает `order`); дни вне каркаса отбрасывает.
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
- **Координаты карт-ссылок: маркер ≠ центр карты.** В URL берём только ТОЧНУЮ
  точку места (Google `!3d!4d`, Kakao `link/map`, Яндекс `whatshere[point]`,
  `?q=`). `@` (Google) и особенно Яндекс `ll`/`pt` — это центр вьюпорта, может
  быть за километры от места; их берём лишь как последний резерв, иначе сначала
  геокодим по чистому имени. Порядок координат всюду `[широта, долгота]` (как у
  Leaflet); Яндекс отдаёт `долгота,широта` — переставляем.
- **CORS: короткие/SPA-ссылки разбирает только сервер.** Браузер не пройдёт по
  редиректу `maps.app.goo.gl` и не прочитает чужую страницу. Это делает
  edge-функция `resolve-link`; фронт `parseLink` — лишь то, что видно прямо в URL.
- **ИИ-маршрут (`generate-itinerary`) — выстраданные грабли:**
  - **Лимит токенов/мин Anthropic.** `web_search` возвращает страницы в модель и
    НАКАПЛИВАЕТ входные токены (~30–50k за одну сборку). На тарифе: Sonnet 30k/мин
    (не тянет), Haiku 50k/мин (тянет одну сборку; частые клики подряд → 502).
    Поэтому модель — **Haiku**, `max_uses` веб-поиска держим **низким (2)**.
  - **Лимит времени edge-функции (~60с).** Геокодинг 20+ мест внутри одной
    функции не влезает → разнесли на `generate-itinerary` (только модель) +
    `geocode` (Nominatim). Из браузера Nominatim не зовётся (нет CORS).
  - **Разбор JSON от модели.** Модель добавляет вступление и markdown-ограждения,
    иногда бьёт JSON. Парсим **по-объектному** (балансировка скобок), один битый
    объект не роняет всё. **НЕ срезать `//`** — съедает `https://` в ссылках.
  - **Модель «зависает» без JSON.** Иногда пишет «нужны ещё поиски»/«позволь
    собрать» и завершает ход без массива. Лечится промптом: запретить вводные
    фразы и доп. поиски, требовать ТОЛЬКО JSON в этом же ответе.
  - Имена/описания — по-русски, плюс отдельное англ. поле `geo` для геокодера
    (кириллический город Nominatim не находит). HTML-мусор чистит `cleanItineraryText`.

## Supabase (БД + серверные функции)

- **Схема** — `supabase/migrations/*_init.sql`: таблица `trips` (jsonb `data`),
  RLS по `user_id = auth.uid()`, триггер `updated_at`, индекс по FK. Применять
  через Supabase Dashboard → SQL Editor.
- **Edge Functions** (`supabase/functions/`, Deno/TypeScript). `npm test` их НЕ
  проверяет (Deno-рантайм, не vitest) — менять осторожно, тестировать `curl`.
  - **`resolve-link` — ЗАДЕПЛОЕН и используется.** Принимает `{url}`,
    разворачивает редирект (без CORS), достаёт координаты маркера + имя из URL,
    `og:image` (фото) и описание; при ключе `ANTHROPIC_API_KEY` дочищает имя и
    пишет краткое описание + гео-запрос через **Haiku** (`claude-haiku-4-5`),
    иначе работает базовый разбор. Нет точного маркера → геокодит по имени
    (Nominatim). Зовётся с фронта через `lib/resolveLink.ts`.
  - **`search-places` — ЗАДЕПЛОЕН.** Принимает `{query, city, country}`,
    при ключе `ANTHROPIC_API_KEY` просит Haiku предложить до 5 реальных мест
    (имя + описание + гео-запрос), геокодит каждое (Nominatim, по очереди —
    лимит ~1 запрос/сек) и возвращает `{candidates:[{name,address,desc,coords}]}`;
    без ключа — прямой поиск Nominatim. Зовётся с фронта через `lib/searchPlaces.ts`.
  - **`generate-itinerary` — ЗАДЕПЛОЕН (ИИ-маршрут, подход B).** Принимает
    `{city, country, startDate, endDate, days, pace, interests}`. Зовёт **Haiku**
    с инструментом `web_search` (редакционные медиа + тревел-блогеры), проверяет
    актуальность и сезон под даты, кластеризует по районам и раскладывает по дням
    под темп; возвращает места с английским полем `geo` (для геокодера), БЕЗ
    координат. Зовётся через `lib/generateItinerary.ts`. **Грабли — см. ниже.**
  - **`geocode` — ЗАДЕПЛОЕН.** Принимает `{queries: string[]}` → `{coords:
    ([lat,lng]|null)[]}` (Nominatim, троттлинг ~1/сек, потолок 40). Отдельная
    функция, потому что геокодинг внутри `generate-itinerary` не влезает в лимит
    времени, а из браузера Nominatim не зовётся (нет CORS).
  - `trends` — ЗАДЕПЛОЕН (каркас доски «Медиа»; сейчас фронт берёт демо-фикстуры).
  - **Деплой функции** (Docker НЕ нужен): `SUPABASE_ACCESS_TOKEN=<sbp-токен> npx
    -y supabase functions deploy resolve-link --project-ref wcipnwgniynriazvqucn`.
    Токен — personal access token из Supabase Dashboard (Account → Tokens),
    ОТЗЫВАТЬ после. `verify_jwt=false` (см. `config.toml`) — зовётся с anon-ключом.
  - **Секреты функции** (напр. `ANTHROPIC_API_KEY`) задаются в Dashboard
    (Project Settings → Edge Functions → Secrets) или `supabase secrets set`;
    читаются в рантайме — менять ключ можно БЕЗ передеплоя.
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
