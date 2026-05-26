# Дизайн: режим «Ссылка» (инбокс неразобранных ссылок)

Дата: 2026-05-26 · Этап 3 из `PLAN.md`

## Цель

Пользователь вставляет ссылку (Instagram, блог, Google/Kakao Maps) → она
попадает в «инбокс не разобрано» на странице поездки → кнопкой «В день»
превращается в место (`Place`) выбранного дня. Исходная ссылка сохраняется на
месте.

## Решения (зафиксированы с владельцем продукта)

1. **Разбор ссылок — фронт-онли.** Координаты достаём прямо из текста URL карт
   (Google/Kakao). Для Instagram/блога ссылка сохраняется как есть, название и
   точку пользователь задаёт сам. Умный разбор через бэкенд (`resolve-link`) —
   позже, за тем же интерфейсом, без переделки UI.
2. **Размещение — сворачиваемый блок** под обложкой, над вкладками дней.
3. **Перенос в день — кнопка «В день ▾»** (выбор дня) → открывается обычная
   форма места, предзаполненная → сохранение создаёт место и убирает ссылку.
4. **Ссылка хранится на месте** (`sourceUrl`) и показывается ссылкой
   «источник ↗» на карточке места.

## Модель данных (`lib/entities.ts`)

### Новый тип `InboxLink`
```ts
export interface InboxLink {
  id: string;          // 'link_…'
  url: string;         // исходная ссылка как вставил пользователь
  name: string;        // разобранное название ('' если не вышло)
  coords: Coords | null; // координаты из map-ссылки, иначе null
  source: string;      // 'google' | 'kakao' | 'instagram' | 'other'
  createdAt: string;   // ISO-время добавления (порядок в списке)
}
```

### Изменения существующих типов
- `TripDoc.inbox: unknown[]` → `InboxLink[]`.
- `Place` получает `sourceUrl: string` (по умолчанию `''`). `createPlace`
  проставляет его из `data.sourceUrl || ''`.
- `PlaceInput` НЕ меняется — `sourceUrl` проставляет мутация переноса, не форма.

### Новые мутации (иммутабельные, как остальные)
- `addInboxLink(trip, url): TripDoc` — вызывает `parseLink(url)`, создаёт
  `InboxLink`, добавляет в начало `inbox` (свежие сверху).
- `removeInboxLink(trip, id): TripDoc`.
- `addPlaceFromInbox(trip, linkId, dayNumber, input): TripDoc` — атомарно:
  создаёт место (`addPlaceToTrip` c `input`, плюс `source:'link'`,
  `sourceUrl: link.url`) и удаляет ссылку из инбокса. Одно сохранение. Если
  `linkId` не найден — возвращает trip без изменений.

### Совместимость
`ensureTripDefaults` приводит старые поездки: если `inbox` не массив → `[]`.
(Поле уже инициализируется `[]` в `createTripDoc`; правка нужна для старых
документов в БД.)

## Разбор ссылки (`lib/parseLink.ts`, чистая функция)

```ts
export interface ParsedLink { name: string; coords: Coords | null; source: string; }
export function parseLink(url: string): ParsedLink;
```

Без сети (браузер не может читать чужие страницы из-за CORS — потому фронт-онли):
- **coords** из текста URL: Google (`@lat,lng`, `!3d<lat>!4d<lng>`,
  `[?&](q|ll|query)=lat,lng`), Kakao (`link/map/<name>,<lat>,<lng>`).
- **name**: Google `/place/<Имя>` (декодировать `+`→пробел, percent-decode);
  иначе `''`.
- **source**: по hostname — `google` (google.*/maps.app.goo.gl/goo.gl/maps),
  `kakao` (kakao*/place.map.kakao), `instagram` (instagr*), иначе `other`.

Логика портируется из `supabase/functions/resolve-link/index.ts`
(`coordsFromUrl`/`nameFromUrl`) — та часть, что работает без fetch.

**Шов под бэкенд:** позже добавится `lib/services/resolveLink.ts` с async
`resolveLink(url): Promise<ParsedLink>`, который при настроенном `functionsUrl`
зовёт `resolve-link`, иначе откатывается на `parseLink`. UI вызывает сервис, а
не `parseLink` напрямую — поэтому подключение бэкенда не трогает компоненты.
В этой итерации делаем только синхронный `parseLink`; вызов оставляем точечным,
чтобы заменить на сервис одной правкой.

## UI

### `components/planner/Inbox.tsx` (+ `Inbox.module.css`)
Пропсы:
```ts
interface Props {
  links: InboxLink[];
  days: Day[];                 // для выбора дня в «В день»
  busy?: boolean;
  onAddLink: (url: string) => void;
  onRemoveLink: (id: string) => void;
  onPlace: (linkId: string, dayNumber: number) => void;
}
```
Поведение:
- Сворачиваемый контейнер. Заголовок-кнопка «🔗 Ссылки · не разобрано (N)» с
  `aria-expanded`; шеврон. Состояние свёрнутости — локальный `useState`
  (развёрнут, если есть ссылки).
- Поле ввода URL (`type=url`, label) + кнопка «＋». Пустой/невалидный ввод не
  добавляет (минимальная проверка: непустая строка). После добавления — очистка.
- Список карточек: название (или укороченный URL, если имени нет), чип-источник
  (иконка/слово по `source`), кнопка «**В день ▾**» и «✕ удалить»
  (с `aria-label`). «В день» — выпадающий список дней (День N · дата/заголовок);
  выбор → `onPlace(linkId, dayNumber)`.
- Пусто: тонкая полоска с полем ввода и подсказкой «Вставьте ссылку на
  место — Instagram, блог, Google или Kakao Maps».
- Доступность: интерактив фокусируем, клавиатура, `prefers-reduced-motion` для
  анимации сворачивания.

### `components/planner/PlaceCard.tsx`
Если `place.sourceUrl` непустой — маленькая ссылка «источник ↗»
(`target=_blank`, `rel="noopener noreferrer"`) среди мета/бейджей.

## Поток в `app/app/trip/page.tsx`

Рендер `<Inbox … />` между `<TripCover>` и `<DayTabs>`.

- `handleAddLink(url)` → `save(addInboxLink(trip, url))`.
- `handleRemoveLink(id)` → `save(removeInboxLink(trip, id))`.
- `handlePlaceFromInbox(linkId, dayNumber)` → открыть форму места в новом
  режиме `FormState = { mode: 'fromInbox'; linkId; dayNumber }`. `PlaceForm`
  получает `initial`/`coords` из разобранной ссылки (name, coords). На submit:
  `save(addPlaceFromInbox(trip, linkId, dayNumber, input))`, затем закрыть форму.
- `PlaceForm` НЕ меняется (уже принимает `initial` и `coords`). `sourceUrl` и
  `source:'link'` проставляет `addPlaceFromInbox`, не форма.

## Тесты

- `lib/parseLink.test.ts` — Google `@`/`!3d!4d`/`q=`, Kakao `link/map`, имя из
  `/place/`, instagram/прочее → `{name:'',coords:null}`, определение `source`.
- `lib/entities.test.ts` — `addInboxLink` (парсит и кладёт в начало),
  `removeInboxLink`, `addPlaceFromInbox` (создаёт место с `sourceUrl`/`source`
  и убирает ссылку; неизвестный id → без изменений), `ensureTripDefaults`
  чинит не-массив `inbox`, `createPlace` дефолтит `sourceUrl`.
- `components/planner/Inbox.test.tsx` — добавление вызывает `onAddLink` с URL;
  пустой ввод не вызывает; «✕» зовёт `onRemoveLink`; выбор дня в «В день» зовёт
  `onPlace(linkId, dayNumber)`; пустой инбокс показывает подсказку.

## Вне объёма (YAGNI)

- Бэкенд-разбор (`resolve-link`), геокодинг, Claude-уточнение — следующая
  итерация за интерфейсом `resolveLink`.
- Drag-and-drop ссылки в день (выбрали кнопку; drag можно добавить позже).
- Редактирование `sourceUrl` в форме места (проставляется автоматически).
- Превью/картинки страниц в инбоксе.
