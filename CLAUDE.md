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

Дополнительно: **перелёт и отели** (закреплённые плитки в ленте, правка в
⚙️ Настройках; геокодинг отеля по названию), **замок места** (защита от очистки/
удаления/переноса), **чеклист места** «что посмотреть/купить» (+ИИ-подсказки),
**ИИ-добор мест в день** и **оптимизация порядка точек** (минимум переходов).
Ещё: **Telegram-предложка** (бот @tripsplan_bot в группе складывает ссылки/фото/
пересланные посты в предложку → место в день или товар в список покупок),
**список покупок** «🛍 Что купить» и **слои-фильтры на карте** (наложить Медиа/
Предложку поверх маршрута — видеть кандидатов рядом, которых ещё нет в маршруте).

## Стек и запуск

- **Next.js 15 (App Router) + React 19 + TypeScript.** Статический экспорт
  (`output: 'export'` → каталог `out/`), без серверного рантайма.
- **Стили — CSS Modules** (`*.module.css` рядом с компонентом) + глобальный
  `app/globals.css` (CSS-переменные в `:root`). Шрифт — Manrope (`next/font`).
- **Хранение и вход — Supabase** (Auth + таблица `trips` с документом в JSONB,
  защита через RLS). Ключи — в `.env.local` (`NEXT_PUBLIC_SUPABASE_*`).
- **Карта** — [Leaflet](https://leafletjs.com/) + тайлы CARTO Voyager (подписи
  местные/корейские; англ. подписи дал бы только векторный провайдер — пока нет).
- **Поиск/геокодинг** — **Kakao Local** (keyword search), секрет `KAKAO_REST_KEY`;
  фолбэк на Nominatim (OSM), если ключа нет. Kakao лучший по корейским местам/отелям.
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
  `updatePlaceInTrip`, `removePlaceFromTrip`, `movePlace`, `updateDay`,
  `updateTripMeta`, `addCategory`, `ensureTripDefaults`, `applyItinerary`,
  `setFlights`/`setHotels`/`clearItinerary`, `togglePlaceLock`, `optimizeDayOrder`,
  `add/toggle/removeChecklistItem`). Никакого I/O — только данные.
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
   `lib/mediaBoard.ts`, `lib/geocode.ts`, `lib/suggestChecklist.ts` — UI зовёт их,
   а не `supabase.functions` напрямую.

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
    AiItinerary (форма ИИ-сборки: темп/интересы/отдых/статус),
    TripSettings (⚙️ модалка: перелёт/отели/очистка маршрута),
    LogisticsTile (закреплённые плитки прилёта/вылета/отелей),
    MediaBoard/MediaTile (витрина «Медиа»),
    SuggestionBoard (Telegram-предложка: подключение + карточки места/покупки),
    ShoppingList (общий список «Что купить»), Section (сворачивающийся блок),
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
  geocode.ts              — батч-геокодинг через edge-функцию geocode (geocodeQueries, toCoords)
  suggestChecklist.ts     — сервис ИИ-подсказок чеклиста места (edge suggest-checklist)
  telegramInbox.ts        — сервис Telegram-предложки (tg_suggestions/tg_links): list/mark/update/ensureLink
  mapLinks.ts             — ссылки «открыть КАРТОЧКУ места» Kakao/Naver/Google (поиск по имени/geo) + isMapLink + kakaoRouteUrl
  kindColors.ts           — цвет метки по типу места (для дифференциации внутри дня)
  mediaBoard.ts, media.ts, mediaDemo.ts — доска «Медиа» (сервис + типы + демо-фикстуры)
  tripMeta.ts             — нормализация списка спутников
  cityCovers.ts           — реестр картинок-обложек по городам (public/covers/)
  dayColors.ts            — палитра цветов дней для карты (обзор «весь маршрут»)
  skyline.ts              — детерминированный пиксель-скайлайн (запасная обложка)
  supabase/client.ts      — синглтон клиента Supabase (читает env)
supabase/                 — серверная часть (БД + Edge Functions, см. ниже)
  migrations/             — схема: trips (jsonb) + RLS; tg_links/tg_suggestions (Telegram-предложка) + бакет tg-photos
  functions/              — все ЗАДЕПЛОЕНЫ (Deno): resolve-link, search-places, generate-itinerary, geocode, trends, suggest-checklist, telegram-webhook
deploy/                   — скрипты развёртывания на VPS (setup/update/cron)
legacy/                   — прежняя ванильная HTML/CSS/JS-версия (НЕ используется)
docs/superpowers/         — планы и спеки этапов миграции
PLAN.md                   — видение продукта и этапы
```

`@/*` в импортах = корень проекта (`tsconfig.json` paths).

## Модель данных (суть)

`TripDoc { id, title, country, city, startDate, endDate, lead, note,
companions[], coverImage, currency, categories[], days[], places[], inbox[],
flights[], hotels[], shopping[] }` — весь документ хранится в колонке `data`
(JSONB) строки таблицы `trips`.

- `Day { number, date, cat, title, sub }` — `cat` ссылается на
  `categories[].key`. `buildDays` строит каркас: день 1 — `start`/«Прилёт»,
  последний — `final`/«Вылет».
- `Place { id, dayNumber, order, name, coords, time, desc, price, image, by,
  kind, note, photo, source, sourceUrl, sourceDate, seasonNote, district,
  geo, locked, checklist[] }` — `order` задаёт ручной порядок в дне (время —
  необязательная подпись). `kind` — формат из `PLACE_KINDS`. Места без `coords`
  не попадают на карту (ИИ-маршрут такие ставит в конец дня без времени, в UI —
  «?»). `dayNumber` 1..N — дни; `0`/`null` — вне дней. `sourceUrl` — исходная
  ссылка из инбокса (иначе `''`). `source:'ai'` + `sourceDate`/`seasonNote`/
  `district` заполняет ИИ-маршрут. `geo` — англ. запрос (название + город +
  страна) для геокодера И для ссылок «открыть карточку места» (рус. имя корейские
  карты ищут плохо). `locked` — защита от очистки/удаления/переноса (кнопка-замок
  в `PlaceCard`; `clearItinerary`/`movePlace`/оптимизация его не трогают).
  `checklist: ChecklistItem{id,text,done}[]` — что посмотреть/купить (мутации
  `add/toggle/removeChecklistItem`; ИИ-подсказки — `suggestChecklist`).
- `ShoppingItem { id, text, url, done, source }` — общий список покупок поездки
  (`shopping[]`, «🛍 Что купить»): галочки, не привязан к месту. Мутации
  `add/toggle/removeShoppingItem`. Сюда уходят товары из Telegram-предложки
  (`source:'tg'`, напр. Oliveyoung) и ручные пункты.
- `Flight { direction:'out'|'back', airport, date, time, flightNo }` и
  `Hotel { id, name, coords, checkIn, checkOut }` — закреплённые данные поездки
  (`flights[]`/`hotels[]`), правятся в `TripSettings` (мутации `setFlights`/
  `setHotels`). Отель геокодится по названию (Kakao). В ленте — `LogisticsTile`
  по датам; на карте — метка 🏨. `clearItinerary` убирает только незамкнутые места.
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
- `ItineraryDraft { places: ItineraryDraftPlace[] }` — результат ИИ-сборки (места
  с `time`, координатами, источником). `applyItinerary(trip, draft)` пакетно
  добавляет места (`source:'ai'`) в свои дни, **дополняя** их: ручные места не
  трогает, новые приписывает после них; дни вне каркаса отбрасывает. ИИ умеет:
  проставлять часы под прилёт/вылет, «первый день — отдых» (галочка), учитывать
  тему дня (тег+заголовок, мягкий приоритет) и **добор мест в один день**
  (`targetDay`+`exclude`, кнопка «✨ Ещё мест»). `optimizeDayOrder` — порядок
  «ближайший сосед» (минимум переходов), времена переставляются по новому порядку.
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
- Визуальный язык (редизайн, Supabase-like): светлый почти белый фон, волосяные
  границы 1px, почти невесомые тени (опора на границы), умеренные углы; коралловый
  акцент — точечно; крупные фото. Токены — в `globals.css` (`--bg/--line/--shadow/
  --radius/--bg-subtle/--line-2/--shadow-md`). **Эмодзи — только в навигации**
  (вкладки дней/Медиа/Предложки), из заголовков блоков и контента убраны. Шапка
  планировщика — светлая sticky-панель. Применяем навыки **frontend-design** и
  **web-design-guidelines**.
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
  (догенерирует дни, проставляет `companions`/`coverImage`/`inbox`/`flights`/
  `hotels`) — при загрузке, если что-то изменилось, тихо пересохраняет. Новые поля
  `Place` (`locked`/`checklist`/…) терпимы к отсутствию (читаются с дефолтом).

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
    `geocode` (Kakao, фолбэк Nominatim). Из браузера эти API не зовутся (нет CORS).
  - **Разбор JSON от модели.** Модель добавляет вступление и markdown-ограждения,
    иногда бьёт JSON. Парсим **по-объектному** (балансировка скобок), один битый
    объект не роняет всё. **НЕ срезать `//`** — съедает `https://` в ссылках.
  - **Модель «зависает» без JSON.** Иногда пишет «нужны ещё поиски»/«позволь
    собрать» и завершает ход без массива. Лечится промптом: запретить вводные
    фразы и доп. поиски, требовать ТОЛЬКО JSON в этом же ответе.
  - Имена/описания — по-русски, плюс отдельное англ. поле `geo` для геокодера
    (кириллицу геокодер находит хуже). HTML-мусор чистит `cleanItineraryText`.
- **Геокодер — Kakao (лучший по Корее), фолбэк Nominatim.** Находит брендовые/
  корейские названия (отели, места), которые OSM не знает; англ. названия кафе
  иногда мимо — тогда фолбэк OSM. Координаты Kakao: документ `x`=долгота, `y`=широта
  → `[y, x]`. Для отеля без находки — ручная точка на карте в `TripSettings`.
- **Тайлы карты — CARTO Voyager; подписи местные (корейские).** Англ. подписи
  дал бы только векторный провайдер (Mapbox/MapTiler + смена движка на MapLibre) —
  пока не делаем. Esri для Кореи отдавал «Map data not yet available» — не годится.

## Supabase (БД + серверные функции)

- **Схема** — `supabase/migrations/`: `*_init.sql` — таблица `trips` (jsonb `data`),
  RLS по `user_id = auth.uid()`, триггер `updated_at`, индекс по FK.
  `*_telegram.sql` — `tg_links` (привязка чата к поездке: `code/trip_id/user_id/
  chat_id`) и `tg_suggestions` (входящие из чата: `kind/url/name/description/image/
  coords/status`), RLS по владельцу поездки; бот пишет сервис-ролью (минует RLS);
  + публичный бакет Storage `tg-photos` (фото из сообщений). **`trip_id` — TEXT**
  (trips.id — text!). Применять через Supabase Dashboard → SQL Editor.
- **Edge Functions** (`supabase/functions/`, Deno/TypeScript). `npm test` их НЕ
  проверяет (Deno-рантайм, не vitest) — менять осторожно, тестировать `curl`.
  - **`resolve-link` — ЗАДЕПЛОЕН и используется.** Принимает `{url}`,
    разворачивает редирект (без CORS), достаёт координаты маркера + имя из URL,
    `og:image` (фото) и описание; при ключе `ANTHROPIC_API_KEY` дочищает имя и
    пишет краткое описание + гео-запрос через **Haiku** (`claude-haiku-4-5`),
    иначе работает базовый разбор. Нет точного маркера → геокодит по имени
    (Nominatim). Зовётся с фронта через `lib/resolveLink.ts`.
  - **`search-places` — ЗАДЕПЛОЕН.** Принимает `{query, city, country}`. Основной
    источник — **Kakao keyword search** (реальные места + адрес + координаты);
    если пусто и есть `ANTHROPIC_API_KEY` — Haiku предлагает кандидатов (понимает
    русские/фаззи запросы), геокодит (Kakao→Nominatim); крайний фолбэк — Nominatim.
    Возвращает `{candidates:[{name,address,desc,coords}]}`. Зовётся через `lib/searchPlaces.ts`.
  - **`generate-itinerary` — ЗАДЕПЛОЕН (ИИ-маршрут, подход B).** Вход: `{city,
    country, startDate, endDate, days, pace, interests, restFirstDay, arrival,
    departure, dayThemes}` ИЛИ режим добора `{targetDay, exclude, dayContext}`.
    Каркас всей поездки строит **Haiku** с `web_search` (медиа + тревел-блогеры) —
    единственный, кто успевает 8+ дней за один вызов (~60с лимит платформы; Sonnet
    влезает лишь ~4 дня → таймаут). **«Добивка» (✨ Ещё мест + добор пустых дней) —
    Sonnet** (`ANTHROPIC_SMART_MODEL`, объём мал) с фолбэком на Haiku; `generate()`
    с ретраем при 429/5xx. Проверяет актуальность/сезон, кластеризует по районам,
    проставляет часы, учитывает темы дней (мягко) и «первый день — отдых».
    Возвращает места с англ. полем `geo`, БЕЗ координат (геокодит клиент через
    `geocode`; не найденные — ретрай по «имя, город, страна», иначе место в конец
    дня без времени, в UI «?»). Через `lib/generateItinerary.ts`. **Грабли — ниже.**
  - **`geocode` — ЗАДЕПЛОЕН.** `{queries: string[]}` → `{coords: ([lat,lng]|null)[]}`.
    Геокодер — **Kakao Local** (`KAKAO_REST_KEY`), фолбэк Nominatim. Отдельная
    функция: геокодинг внутри `generate-itinerary` не влезал в лимит времени, а
    из браузера эти API не зовутся (CORS). Потолок 40 запросов.
  - **`trends` — ЗАДЕПЛОЕН (доска «Медиа»).** Haiku + `web_search` по медиа/
    блогерам, параметр `exclude` (чтобы «Обновить» приносил новое); координаты
    проставляет клиент через `geocode`. Для демо-городов фронт берёт фикстуры.
  - **`suggest-checklist` — ЗАДЕПЛОЕН.** `{name, city, country, kind}` → `{items:
    string[]}` (3–6 пунктов «что посмотреть/купить»). Haiku БЕЗ веб-поиска —
    быстро/дёшево/без лимитов. Через `lib/suggestChecklist.ts`.
  - **`telegram-webhook` — ЗАДЕПЛОЕН (Telegram-предложка).** Вебхук бота
    **@tripsplan_bot** в группе. Проверяет секрет в заголовке
    `X-Telegram-Bot-Api-Secret-Token`; `/connect <код>` привязывает чат к поездке
    (`tg_links`). Три режима сообщения: СПИСОК (нумерованные/маркированные строки
    или строки со ссылкой → каждый пункт, без лимита), одиночная ССЫЛКА (resolve-link:
    фото/координаты/описание), ФОТО/ПЕРЕСЛАННОЕ без ссылки (Haiku-разбор + фото в
    бакет `tg-photos`). Классификация место|покупка по домену (oliveyoung/coupang/…).
    Карт-ссылки (`isMapLink`) фото не сохраняют (og:image — скриншот карты). Пишет
    в `tg_suggestions` сервис-ролью. Секреты: `TELEGRAM_BOT_TOKEN`,
    `TELEGRAM_WEBHOOK_SECRET` (+ инжектятся `SUPABASE_URL`/`*_KEY`). Клиент —
    `lib/telegramInbox.ts`; разбор ссылок предложки (фото/координаты) идёт НА
    КЛИЕНТЕ (вебхук в лимит не успел бы). **Грабли: privacy mode у бота — ниже.**
  - **Деплой функции** (Docker НЕ нужен): `SUPABASE_ACCESS_TOKEN=<sbp-токен> npx
    -y supabase functions deploy resolve-link --project-ref wcipnwgniynriazvqucn`.
    Токен — personal access token из Supabase Dashboard (Account → Tokens),
    ОТЗЫВАТЬ после. `verify_jwt=false` (см. `config.toml`) — зовётся с anon-ключом.
  - **Секреты функции** (`ANTHROPIC_API_KEY`, `KAKAO_REST_KEY`, `TELEGRAM_BOT_TOKEN`,
    `TELEGRAM_WEBHOOK_SECRET`) задаются в Dashboard (Project Settings → Edge
    Functions → Secrets) или `supabase secrets set`; читаются в рантайме — менять
    ключ можно БЕЗ передеплоя. `KAKAO_REST_KEY` — REST API key из Kakao Developers
    (бесплатная квота; включить сервис «Kakao Map / Local» в Product Settings).
  - **Telegram-бот — грабли:** privacy mode ОБЯЗАТЕЛЬНО off (@BotFather
    `/setprivacy → Disable`), И бота надо УДАЛИТЬ и заново ДОБАВИТЬ в группу
    (приватность кэшируется на момент входа). Проверка: `getMe` →
    `can_read_all_group_messages: true`. Вебхук ставится: `setWebhook url=…/functions/
    v1/telegram-webhook secret_token=<TELEGRAM_WEBHOOK_SECRET> allowed_updates=["message"]`.
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
