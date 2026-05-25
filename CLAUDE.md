# CLAUDE.md

Гид по проекту для разработчиков и ИИ-ассистентов. Кратко: что это, как
запускать, как устроено и где что менять. Подробное видение продукта — в
`PLAN.md`.

## Что это

Веб-планировщик путешествий. Стартовал как лендинг поездки в Сеул, растёт в
продукт: создаёшь поездку (перелёт + даты → календарь дней), наполняешь дни
местами (вручную, позже — ссылками и через ИИ), настраиваешь категории и
переменные поездки. Текущая витрина — готовая поездка «Сеул».

## Стек и запуск

- **Чистый HTML + CSS + ванильный JavaScript (ES-модули). Сборки нет.**
- Карта — [Leaflet](https://leafletjs.com/) + тайлы OpenStreetMap (CDN).
- Хранение — `localStorage` (за интерфейсом, см. ниже).

```bash
npm run dev      # поднять локальный сервер (npx serve) → http://localhost:3000
npm run check    # проверка синтаксиса всех JS-модулей (наш мини-CI)
```

Можно и просто открыть `index.html` в браузере (нужен интернет для Leaflet/тайлов).

## Архитектура (важно сохранять)

Слоистая, с чёткими границами — чтобы позже подключить бэкенд (Supabase) и ИИ
без переписывания:

```
UI (js/ui/*) → Store (js/store) → Repository (js/data) → Model (js/model)
                                   AI-сервис (js/ai) — отдельно, за интерфейсом
```

**Три правила, которые нельзя нарушать:**

1. **UI никогда не трогает `localStorage` напрямую** — только через Store →
   Repository. Замена хранилища на Supabase = новая реализация `Repository`.
2. **Методы Repository асинхронны (`async`)** уже сейчас, хотя localStorage
   синхронный — чтобы переход на сеть не менял сигнатуры.
3. **ИИ-генерация спрятана за интерфейсом `AiService`** (`js/ai`), сейчас
   mock-реализация. Меняется только реализация, не вызовы.

Поток данных: UI вызывает методы `Store` → `Store` меняет поездку, сохраняет
через `Repository` и через `subscribe`/`_emit` уведомляет подписчиков →
`render(store)` в `app.js` перерисовывает всё из состояния.

## Карта файлов

```
index.html              — каркас: #view-app (поездка) и #view-page (страницы-роуты)
css/styles.css          — все стили (CSS-переменные в :root)
js/
  app.js                — точка входа: собирает слои, роутинг, общий render()
  model/
    entities.js         — формы данных и фабрики (createTrip/Place/Day/Category…),
                          помощники: getDay, getCategory, placesForDay,
                          normalizeDayOrders, tripPeople, byOptions
    days.js             — генерация каркаса дней, формат дат (addDays, formatDateRu,
                          formatDateRange, buildDays)
    config.js           — DEFAULT_CATEGORIES (стартовый набор категорий)
    seed.seoul.js       — готовая поездка «Сеул» (она же seed «опыта»)
  data/
    repository.js       — контракт хранилища (JSDoc)
    localStorageRepo.js — реализация на localStorage (async)
  store/store.js        — состояние + подписка + мутации (addPlace, updateDay,
                          setDayOrder, moveToDayEnd, updateTrip, setCategories…)
  ai/
    aiService.js        — контракт generateItinerary()
    mockAiService.js    — заглушка (отдаёт места из seed)
  ui/
    hero.js             — шапка из данных поездки + полоса показателей
    tripBar.js          — выбор поездки + «Настройки» + «Новая поездка»
    calendar.js         — вкладки дней (tablist, доступность)
    timeline.js         — расписание дня, карточки мест, строки начала/конца дня
    placeForm.js        — панель добавления/редактирования места
    dayForm.js          — встроенная форма настройки дня
    settingsForm.js     — страница «Настройки поездки» (#/settings)
    tripForm.js         — страница «Новая поездка» (#/new)
    dnd.js              — drag-and-drop мест (порядок внутри дня, перенос между днями)
    map.js              — карта Leaflet (маркеры, маршрут, выбор точки кликом)
    helpers.js          — бейджи (категория/цена/автор), ссылка Kakao
  config.js             — опц. подгрузка config.local.js (иначе локальный режим)
  data/supabaseRepo.js  — Repository через Supabase REST (тот же контракт)
  ai/apiAiService.js    — AiService через edge-функцию (настоящий Claude)
  services/resolveLink.js — клиент edge-функции «чтения» ссылок
supabase/                — БД и серверные функции (стандартная структура)
  migrations/            — схема БД: trips (jsonb) + RLS + индексы
  functions/             — resolve-link, generate-itinerary, trends (Deno)
  config.toml            — конфиг CLI (функции без verify_jwt)
  README.md              — деплой через GitHub (2 способа), ключи
.github/workflows/deploy-supabase.yml — авто-деплой функций/миграций по пушу
config.local.example.js — шаблон конфига (копировать в config.local.js)
PLAN.md                 — видение продукта и план по этапам
```

## Модель данных (суть)

`Trip { id, title, city, country, startDate, endDate, lead, note, travelers,
people[], currency, budget, interests[], pace, categories[], hotel{name,coords},
flights[], days[], places[], inbox[] }`

- `Day { number, date, cat, title, sub, start, end }` — `cat` ссылается на
  `categories[].key`; `start`/`end` — время дня.
- `Place { id, dayNumber, order, type, name, coords, time, photo, price, by,
  desc, history, source }` — `order` задаёт ручной порядок в дне (время —
  необязательная подпись). `type`: `hotel`|`airport`|null. `dayNumber:0` —
  отель (база). Места без `coords` не попадают на карту.
- `Category { key, label, color }` — цвет (HEX) хранится в данных, применяется
  inline (вкладки, бейджи, линия маршрута).

## Роутинг (хэш)

`app.js` слушает `hashchange`. `#/new` — страница создания поездки, `#/settings`
(алиас `#/categories`) — настройки поездки. Иначе — основной вид. Страницы
рисуются в `#view-page`, основной вид — `#view-app`.

## Соглашения

- Язык интерфейса и комментариев — русский.
- Новые экраны — в едином визуальном языке (тёмно-синий + коралловый акцент,
  белые скруглённые карточки). Применяем frontend-design и web-design-guidelines.
- Доступность: интерактивные элементы фокусируемы и работают с клавиатуры;
  уважать `prefers-reduced-motion`; `touch-action: manipulation`.
- Цвета — через CSS-переменные в `:root`.

## Персистентность

`app.js` грузит сохранённую поездку, если она есть, иначе кладёт seed Сеула.
Правки пользователя сохраняются между перезагрузками. `createTrip` подставляет
дефолты для отсутствующих полей — старые сохранённые поездки совместимы.

## Грабли (уже наступали)

- **Сигнатуры помощников.** `catBadge(trip, key)` и `priceBadge(price, currency)`
  принимают поездку/валюту. Меняя сигнатуру помощника — проверь ВСЕ вызовы
  (`grep`), включая попап карты (`map.js`).
- **Обработчики по id.** Формы ищут элементы по `#id`. Если у элемента нет `id`,
  `querySelector` вернёт `null` и навешивание упадёт, оставив остальные кнопки
  без обработчиков. Давать `id` или искать по классу.
- **Кнопка внутри `<label>`.** Клик по кнопке внутри `<label>` перехватывается
  меткой. Интерактив выносить из `<label>`.
- **Скрытая карта.** После показа ранее скрытого вида звать
  `map.invalidateSize()` (см. `route()`), иначе тайлы «серые».

## Бэкенд (опционально, выключен по умолчанию)

Каркас, готовый «подключить ключи». **По умолчанию выключен**: без
`config.local.js` приложение работает локально (localStorage + MockAiService),
поведение не меняется.

- **Включение** — скопировать `config.local.example.js` → `config.local.js`,
  вписать Supabase и/или `functionsUrl`. Тогда `app.js` сам выбирает
  `SupabaseRepository` вместо localStorage и `ApiAiService` вместо mock, а
  разбор ссылок идёт через функцию `resolve-link` (с откатом на фронт).
- **Секреты не коммитим**: `config.local.js`, `.env` — в `.gitignore`. Ключи
  функций — в секретах Supabase (`supabase secrets set …`).
- **Контракты те же**: `Repository` и `AiService` не менялись — поэтому смена
  локального на облачное не трогает UI/Store.
- **TODO для боевого использования**: экран входа (Supabase Auth) — RLS требует
  пользовательский JWT. Без входа работают только функции (ссылки/ИИ), но не
  синхронизация БД. Подробности — `supabase/README.md`.
- Функции в `supabase/functions/` — Deno (TypeScript), `npm run check` их не проверяет
  (он только для `js/`).

## Как добавить типичное

- **Поле места** — в `createPlace` (`entities.js`) + в форму `placeForm.js` + в
  отрисовку `timeline.js`/`map.js`.
- **Переменную поездки** — в `createTrip` + раздел в `settingsForm.js` + при
  необходимости в `hero.js`/где используется.
- **Новую страницу-роут** — ветка в `route()` (`app.js`) + рендер-модуль в
  `js/ui`, который рисует в `#view-page`.
- **Содержимое поездки Сеул** — `js/model/seed.seoul.js`.
