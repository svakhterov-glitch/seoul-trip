# TripsPlan — Этап 2 (Next.js): экран открытия поездки (MVP) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Открыть поездку как планировщик — календарь дней, карта Leaflet, добавление/редактирование/удаление мест с сохранением в Supabase.

**Architecture:** Чистые функции и обращения к Supabase в `lib/` (Vitest), тонкие клиентские React-компоненты в `components/planner/`. Состояние поездки — локальный `useState` страницы `/app/trip/`; мутации иммутабельны и сохраняются целым документом через `updateTrip`. Карта изолирована в клиентский компонент, грузится только в браузере (`next/dynamic`, `ssr:false`).

**Tech Stack:** Next.js 15 (статический экспорт), React 19, TypeScript, `@supabase/supabase-js` v2, Leaflet, Vitest + @testing-library/react, CSS Modules.

**Спек:** `docs/superpowers/specs/2026-05-25-nextjs-stage2-planner-design.md`

**Ветка:** работаем прямо в `main` (Этап 1 уже на боевом сервере, cron-автодеплой пересобирает при изменениях). Каждая задача — отдельный коммит; пуш в `main` = деплой.

---

## Структура файлов (что и зачем)

**Создаём:**
- `lib/days.ts` (+ `lib/days.test.ts`) — даты и каркас дней.
- `lib/placeValidation.ts` (+ `.test.ts`) — `validatePlace()` (чистая).
- `components/planner/badges.tsx` (+ `badges.module.css`) — `CatBadge`, `PriceBadge`.
- `components/planner/PlannerHeader.tsx` (+ `.module.css`).
- `components/planner/DayTabs.tsx` (+ `.module.css`, + `DayTabs.test.tsx`).
- `components/planner/PlaceCard.tsx` (+ `.module.css`).
- `components/planner/Timeline.tsx` (+ `.module.css`, + `Timeline.test.tsx`).
- `components/planner/PlaceForm.tsx` (+ `.module.css`, + `PlaceForm.test.tsx`).
- `components/planner/TripMap.tsx` (+ `.module.css`) — Leaflet, без юнит-теста.
- `app/app/trip/page.tsx` (+ `app/app/trip/page.module.css`).

**Модифицируем:**
- `lib/entities.ts` — типы `Day`/`Place`, фабрики, `buildDays` в `createTripDoc`, помощники чтения и иммутабельные мутации.
- `lib/trips.ts` — `getTrip()`, `updateTrip()`.
- `app/app/page.tsx` — `onOpen` ведёт на `/app/trip/?id=…`.
- `package.json` — зависимости `leaflet`, `@types/leaflet`.

---

## Task 1: Даты и каркас дней (`lib/days.ts`)

**Files:**
- Create: `lib/days.ts`
- Test: `lib/days.test.ts`

- [ ] **Step 1: Написать падающий тест**

`lib/days.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { addDays, formatDateRu, formatDateRange, daysBetween, buildDays } from '@/lib/days';

describe('addDays', () => {
  it('прибавляет дни через границу месяца', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
  });
  it('нулевое смещение возвращает ту же дату', () => {
    expect(addDays('2026-06-07', 0)).toBe('2026-06-07');
  });
});

describe('formatDateRu', () => {
  it('форматирует день и месяц по-русски', () => {
    expect(formatDateRu('2026-06-08')).toBe('8 июня');
  });
});

describe('formatDateRange', () => {
  it('один месяц — компактно', () => {
    expect(formatDateRange('2026-06-07', '2026-06-15')).toBe('7–15 июня 2026');
  });
  it('разные месяцы — полно', () => {
    expect(formatDateRange('2026-06-28', '2026-07-03')).toBe('28 июня – 3 июля 2026');
  });
});

describe('daysBetween', () => {
  it('считает включительно', () => {
    expect(daysBetween('2026-06-07', '2026-06-15')).toBe(9);
  });
  it('одна и та же дата → 1', () => {
    expect(daysBetween('2026-06-07', '2026-06-07')).toBe(1);
  });
});

describe('buildDays', () => {
  it('строит дни с первым «Прилёт» и последним «Вылет»', () => {
    const days = buildDays('2026-06-07', '2026-06-09');
    expect(days).toHaveLength(3);
    expect(days[0]).toMatchObject({ number: 1, date: '7 июня', cat: 'start', title: 'Прилёт' });
    expect(days[1]).toMatchObject({ number: 2, date: '8 июня', cat: null, title: 'День 2' });
    expect(days[2]).toMatchObject({ number: 3, date: '9 июня', cat: 'final', title: 'Вылет' });
  });
  it('поездка из одного дня', () => {
    const days = buildDays('2026-06-07', '2026-06-07');
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ number: 1, cat: 'start' });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- days`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `lib/days.ts`**

```ts
import { createDay, type Day } from '@/lib/entities';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** 'YYYY-MM-DD' + смещение в днях → 'YYYY-MM-DD' */
export function addDays(isoDate: string, offset: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → '8 июня' */
export function formatDateRu(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

/** '2026-06-07'+'2026-06-15' → '7–15 июня 2026' (умно по месяцам/годам) */
export function formatDateRange(startIso: string, endIso: string): string {
  const a = new Date(startIso + 'T00:00:00');
  const b = new Date(endIso + 'T00:00:00');
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS_RU[b.getMonth()]} ${b.getFullYear()}`;
  }
  const left = `${a.getDate()} ${MONTHS_RU[a.getMonth()]}`;
  const right = `${b.getDate()} ${MONTHS_RU[b.getMonth()]} ${b.getFullYear()}`;
  return `${left} – ${right}`;
}

/** число дней между датами включительно */
export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso + 'T00:00:00');
  const b = new Date(endIso + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

/** Пустой каркас дней: первый — 'start'/«Прилёт», последний — 'final'/«Вылет». */
export function buildDays(startDate: string, endDate: string): Day[] {
  const total = daysBetween(startDate, endDate);
  const days: Day[] = [];
  for (let i = 0; i < total; i++) {
    const number = i + 1;
    const date = addDays(startDate, i);
    let cat: string | null = null;
    if (number === 1) cat = 'start';
    else if (number === total) cat = 'final';
    days.push(
      createDay({
        number,
        date: formatDateRu(date),
        cat,
        title: number === 1 ? 'Прилёт' : number === total ? 'Вылет' : `День ${number}`,
      }),
    );
  }
  return days;
}
```

(Примечание: `createDay` и тип `Day` создаются в Task 2; этот модуль их импортирует. Реализуйте Task 1 и Task 2 как пару — тесты Task 1 пройдут после Task 2.)

- [ ] **Step 4: Зафиксировать (тесты прогоним в Task 2)**

```bash
git add lib/days.ts lib/days.test.ts
git commit -m "feat: lib/days — даты и каркас дней (buildDays)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Расширение модели (`lib/entities.ts`)

**Files:**
- Modify: `lib/entities.ts`
- Test: `lib/entities.test.ts` (дополнить)

- [ ] **Step 1: Дописать тесты в `lib/entities.test.ts`**

Добавить в конец файла:
```ts
import {
  createDay, createPlace, ensureDays, placesForDay, getDay, lastDayNumber,
  addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip,
} from '@/lib/entities';

describe('createTripDoc генерирует дни', () => {
  it('строит каркас дней из дат', () => {
    const t = createTripDoc({ title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(t.days).toHaveLength(3);
    expect(t.days[0].number).toBe(1);
  });
});

describe('ensureDays', () => {
  it('догенерирует дни, если их нет', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const empty = { ...t, days: [] };
    const fixed = ensureDays(empty);
    expect(fixed.days).toHaveLength(3);
  });
  it('не трогает поездку с днями', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(ensureDays(t)).toBe(t);
  });
});

describe('мутации мест (иммутабельно)', () => {
  const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('addPlaceToTrip добавляет место в конец дня с order', () => {
    const t1 = addPlaceToTrip(base, 2, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const t2 = addPlaceToTrip(t1, 2, { name: 'Парк', coords: [37.6, 127.1], time: '', desc: '', price: null, image: '' });
    const day2 = placesForDay(t2, 2);
    expect(day2.map((p) => p.name)).toEqual(['Кафе', 'Парк']);
    expect(day2[0].order).toBe(0);
    expect(day2[1].order).toBe(1);
    expect(base.places).toHaveLength(0); // исходник не мутирован
  });

  it('updatePlaceInTrip меняет поля места', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = updatePlaceInTrip(t1, id, { name: 'Кофейня', time: '10:00' });
    expect(placesForDay(t2, 1)[0]).toMatchObject({ name: 'Кофейня', time: '10:00' });
  });

  it('removePlaceFromTrip удаляет место', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = removePlaceFromTrip(t1, id);
    expect(placesForDay(t2, 1)).toHaveLength(0);
  });
});

describe('помощники чтения', () => {
  const t = addPlaceToTrip(
    createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' }),
    2, { name: 'A', coords: [37, 127], time: '', desc: '', price: null, image: '' });
  it('getDay по номеру', () => { expect(getDay(t, 2)?.number).toBe(2); });
  it('lastDayNumber', () => { expect(lastDayNumber(t)).toBe(3); });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- entities`
Expected: FAIL (нет экспортов `createDay`, `createPlace`, … ).

- [ ] **Step 3: Заменить `lib/entities.ts` целиком**

```ts
import { buildDays } from '@/lib/days';

export interface Category {
  key: string;
  label: string;
  color: string;
}

// Стартовый набор категорий (порт из legacy js/model/config.js).
export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'start', label: 'Прилёт/отъезд', color: '#6b7385' },
  { key: 'tour', label: 'Экскурсии', color: '#2f6fd6' },
  { key: 'dist', label: 'Прогулки', color: '#159a93' },
  { key: 'shop', label: 'Шопинг', color: '#d98a1b' },
  { key: 'trend', label: 'Тренды', color: '#9a55c9' },
  { key: 'final', label: 'Вылет', color: '#6b7385' },
];

export type Coords = [number, number];
export type PlacePrice = 'free' | 1 | 2 | 3 | null;

export interface Day {
  number: number;
  date: string;
  cat: string | null;
  title: string;
  sub: string;
}

export interface Place {
  id: string;
  dayNumber: number | null;
  order: number | null;
  name: string;
  coords: Coords | null;
  time: string;
  desc: string;
  price: PlacePrice;
  image: string;
  photo: string;
  source: string;
}

/** Данные формы места (без id/order/dayNumber — их проставляют мутации). */
export interface PlaceInput {
  name: string;
  coords: Coords | null;
  time: string;
  desc: string;
  price: PlacePrice;
  image: string;
}

export interface TripDoc {
  id: string;
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  lead: string;
  note: string;
  currency: string;
  categories: Category[];
  days: Day[];
  places: Place[];
  inbox: unknown[];
}

export interface CreateTripInput {
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createDay(data: Partial<Day> & { number: number }): Day {
  return {
    number: data.number,
    date: data.date || '',
    cat: data.cat ?? null,
    title: data.title || '',
    sub: data.sub || '',
  };
}

export function createPlace(data: Partial<Place> = {}): Place {
  return {
    id: data.id || newId('place'),
    dayNumber: data.dayNumber ?? null,
    order: data.order ?? null,
    name: data.name || '',
    coords: data.coords ?? null,
    time: data.time || '',
    desc: data.desc || '',
    price: data.price ?? null,
    image: data.image || '',
    photo: data.photo || '📍',
    source: data.source || 'manual',
  };
}

export function createTripDoc(input: CreateTripInput): TripDoc {
  return {
    id: newId('trip'),
    title: input.title.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    lead: '',
    note: '',
    currency: 'RUB',
    categories: DEFAULT_CATEGORIES,
    days: buildDays(input.startDate, input.endDate),
    places: [],
    inbox: [],
  };
}

/* ---------- помощники чтения ---------- */

export function getDay(trip: TripDoc, number: number): Day | null {
  return trip.days.find((d) => d.number === number) || null;
}

export function getCategory(trip: TripDoc, key: string | null): Category | null {
  if (!key) return null;
  return trip.categories.find((c) => c.key === key) || null;
}

export function lastDayNumber(trip: TripDoc): number {
  return trip.days.reduce((m, d) => Math.max(m, d.number), 0);
}

/** Места дня в ручном порядке (order), затем по времени. */
export function placesForDay(trip: TripDoc, dayNumber: number): Place[] {
  return trip.places
    .filter((p) => p.dayNumber === dayNumber)
    .sort((a, b) => {
      const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
      if (ao !== bo) return ao - bo;
      return (a.time || '').localeCompare(b.time || '');
    });
}

/** Все «дневные» места (1..последний день) — для обзорной карты. */
export function allDayPlaces(trip: TripDoc): Place[] {
  const last = lastDayNumber(trip);
  return trip.places.filter((p) => (p.dayNumber ?? 0) >= 1 && (p.dayNumber ?? 0) <= last);
}

function maxOrderInDay(trip: TripDoc, dayNumber: number): number {
  return trip.places
    .filter((p) => p.dayNumber === dayNumber)
    .reduce((m, p) => Math.max(m, p.order ?? -1), -1);
}

/* ---------- иммутабельные мутации (возвращают новый документ) ---------- */

/** Догенерировать каркас дней, если их нет (для старых поездок Этапа 1). */
export function ensureDays(trip: TripDoc): TripDoc {
  if (trip.days.length > 0) return trip;
  return { ...trip, days: buildDays(trip.startDate, trip.endDate) };
}

export function addPlaceToTrip(trip: TripDoc, dayNumber: number, input: PlaceInput): TripDoc {
  const place = createPlace({
    ...input,
    dayNumber,
    order: maxOrderInDay(trip, dayNumber) + 1,
  });
  return { ...trip, places: [...trip.places, place] };
}

export function updatePlaceInTrip(trip: TripDoc, id: string, patch: Partial<Place>): TripDoc {
  return {
    ...trip,
    places: trip.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

export function removePlaceFromTrip(trip: TripDoc, id: string): TripDoc {
  return { ...trip, places: trip.places.filter((p) => p.id !== id) };
}
```

- [ ] **Step 4: Запустить — entities и days должны пройти**

Run: `npm test -- entities days`
Expected: PASS (включая ранее написанные тесты Task 1).

- [ ] **Step 5: Commit**

```bash
git add lib/entities.ts lib/entities.test.ts
git commit -m "feat: модель Этапа 2 — Day/Place, buildDays в createTripDoc, мутации мест

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Чтение/обновление поездки (`lib/trips.ts`)

**Files:**
- Modify: `lib/trips.ts`
- Test: `lib/trips.test.ts` (дополнить)

- [ ] **Step 1: Дописать тесты в `lib/trips.test.ts`**

Добавить в конец файла:
```ts
import { getTrip, updateTrip } from '@/lib/trips';

describe('getTrip', () => {
  it('возвращает документ с id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'trip_1', data: { id: 'trip_1', title: 'Сеул' } }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient;
    const trip = await getTrip(client, 'trip_1');
    expect(trip?.id).toBe('trip_1');
    expect(trip?.title).toBe('Сеул');
    expect(eq).toHaveBeenCalledWith('id', 'trip_1');
  });

  it('нет строки → null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient;
    expect(await getTrip(client, 'nope')).toBeNull();
  });

  it('ошибка → исключение', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient;
    await expect(getTrip(client, 'x')).rejects.toThrow();
  });
});

describe('updateTrip', () => {
  it('пишет data по id и возвращает документ', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;
    const doc = { id: 'trip_x', title: 'Токио' } as never;
    const res = await updateTrip(client, doc);
    expect(update).toHaveBeenCalledWith({ data: doc });
    expect(eq).toHaveBeenCalledWith('id', 'trip_x');
    expect(res).toBe(doc);
  });

  it('ошибка → исключение', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'rls' } });
    const client = { from: () => ({ update: () => ({ eq }) }) } as unknown as SupabaseClient;
    await expect(updateTrip(client, { id: 'a' } as never)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- trips`
Expected: FAIL (нет `getTrip`/`updateTrip`).

- [ ] **Step 3: Дописать `lib/trips.ts`**

Добавить в конец файла:
```ts
export async function getTrip(supabase: SupabaseClient, id: string): Promise<TripSummary | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('id,data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { id: string; data: TripDoc };
  return { ...row.data, id: row.id };
}

export async function updateTrip(supabase: SupabaseClient, doc: TripDoc): Promise<TripDoc> {
  const { error } = await supabase.from('trips').update({ data: doc }).eq('id', doc.id);
  if (error) throw error;
  return doc;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- trips`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/trips.ts lib/trips.test.ts
git commit -m "feat: getTrip/updateTrip — чтение и сохранение поездки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Бейджи (`components/planner/badges.tsx`)

**Files:**
- Create: `components/planner/badges.tsx`, `components/planner/badges.module.css`

- [ ] **Step 1: Создать `components/planner/badges.tsx`**

```tsx
import type { Category, PlacePrice } from '@/lib/entities';
import styles from './badges.module.css';

export function CatBadge({ category }: { category: Category | null }) {
  if (!category) return null;
  return (
    <span className={styles.cat} style={{ background: category.color }}>{category.label}</span>
  );
}

const PRICE_LABEL: Record<string, string> = { free: 'Бесплатно', '1': '₽', '2': '₽₽', '3': '₽₽₽' };

export function PriceBadge({ price }: { price: PlacePrice }) {
  if (price === null || price === undefined) return null;
  const label = PRICE_LABEL[String(price)];
  if (!label) return null;
  return <span className={styles.price}>{label}</span>;
}
```

- [ ] **Step 2: Создать `components/planner/badges.module.css`**

```css
.cat { display: inline-block; font-size: 11px; font-weight: 700; color: #fff; padding: 2px 8px; border-radius: 999px; }
.price { display: inline-block; font-size: 11px; font-weight: 700; color: var(--navy); background: #eef0f6; padding: 2px 8px; border-radius: 999px; }
```

- [ ] **Step 3: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add components/planner/badges.tsx components/planner/badges.module.css
git commit -m "feat: бейджи категории и цены (планировщик)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Шапка планировщика (`components/planner/PlannerHeader.tsx`)

**Files:**
- Create: `components/planner/PlannerHeader.tsx`, `components/planner/PlannerHeader.module.css`

- [ ] **Step 1: Создать `components/planner/PlannerHeader.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { formatDateRange } from '@/lib/days';
import styles from './PlannerHeader.module.css';

export function PlannerHeader({ title, startDate, endDate }: { title: string; startDate: string; endDate: string }) {
  return (
    <header className={styles.bar}>
      <Link href="/app" className={styles.back}>← Мои поездки</Link>
      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
        <div className={styles.dates}>{formatDateRange(startDate, endDate)}</div>
      </div>
      <div className={styles.spacer} />
    </header>
  );
}
```

- [ ] **Step 2: Создать `components/planner/PlannerHeader.module.css`**

```css
.bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: var(--navy); color: #fff; }
.back { font-size: 13px; color: #c7cde0; white-space: nowrap; }
.back:hover { color: #fff; }
.center { text-align: center; }
.title { font-weight: 800; font-size: 16px; }
.dates { font-size: 12px; color: #c7cde0; }
.spacer { width: 96px; }
@media (max-width: 560px) { .spacer { display: none; } }
```

- [ ] **Step 3: Commit**

```bash
git add components/planner/PlannerHeader.tsx components/planner/PlannerHeader.module.css
git commit -m "feat: PlannerHeader — шапка экрана поездки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Вкладки дней (`components/planner/DayTabs.tsx`)

**Files:**
- Create: `components/planner/DayTabs.tsx`, `components/planner/DayTabs.module.css`
- Test: `components/planner/DayTabs.test.tsx`

- [ ] **Step 1: Написать тест**

`components/planner/DayTabs.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayTabs } from '@/components/planner/DayTabs';
import type { Day } from '@/lib/entities';

const days: Day[] = [
  { number: 1, date: '7 июня', cat: 'start', title: 'Прилёт', sub: '' },
  { number: 2, date: '8 июня', cat: null, title: 'День 2', sub: '' },
];

describe('DayTabs', () => {
  it('рисует «Весь маршрут» и дни', () => {
    render(<DayTabs days={days} categories={[]} activeDay={0} onSelect={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Весь маршрут/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /День 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /День 2/i })).toBeInTheDocument();
  });

  it('клик по дню вызывает onSelect с номером', async () => {
    const onSelect = vi.fn();
    render(<DayTabs days={days} categories={[]} activeDay={0} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('tab', { name: /День 2/i }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- DayTabs`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Создать `components/planner/DayTabs.tsx`**

```tsx
'use client';

import type { Day, Category } from '@/lib/entities';
import styles from './DayTabs.module.css';

interface Props {
  days: Day[];
  categories: Category[];
  activeDay: number;
  onSelect: (day: number) => void;
}

export function DayTabs({ days, categories, activeDay, onSelect }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Дни поездки">
      <button type="button" role="tab" aria-selected={activeDay === 0}
        className={activeDay === 0 ? styles.tabOn : styles.tab}
        onClick={() => onSelect(0)}>Весь маршрут</button>
      {days.map((d) => {
        const color = categories.find((c) => c.key === d.cat)?.color;
        const on = activeDay === d.number;
        return (
          <button key={d.number} type="button" role="tab" aria-selected={on}
            className={on ? styles.tabOn : styles.tab}
            style={on && color ? { background: color, borderColor: color, color: '#fff' } : undefined}
            onClick={() => onSelect(d.number)}>
            <span className={styles.dnum}>День {d.number}</span>
            <span className={styles.ddate}>{d.date}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Создать `components/planner/DayTabs.module.css`**

```css
.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 14px 24px; background: var(--bg); border-bottom: 1px solid var(--line); }
.tab, .tabOn { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 600; color: var(--navy); }
.tabOn { background: var(--navy); border-color: var(--navy); color: #fff; }
.dnum { font-weight: 700; }
.ddate { font-size: 11px; opacity: .8; }
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npm test -- DayTabs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/planner/DayTabs.tsx components/planner/DayTabs.module.css components/planner/DayTabs.test.tsx
git commit -m "feat: DayTabs — вкладки дней с обзором

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Карточка места и расписание (`PlaceCard`, `Timeline`)

**Files:**
- Create: `components/planner/PlaceCard.tsx`, `components/planner/PlaceCard.module.css`
- Create: `components/planner/Timeline.tsx`, `components/planner/Timeline.module.css`
- Test: `components/planner/Timeline.test.tsx`

- [ ] **Step 1: Написать тест Timeline**

`components/planner/Timeline.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '@/components/planner/Timeline';
import { createTripDoc, addPlaceToTrip } from '@/lib/entities';

function tripWithPlace() {
  const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
  return addPlaceToTrip(base, 1, { name: 'Дворец Кёнбоккун', coords: [37.5, 127], time: '10:00', desc: 'Главный дворец', price: 1, image: '' });
}

describe('Timeline', () => {
  it('рисует место выбранного дня', () => {
    render(<Timeline trip={tripWithPlace()} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    expect(screen.getByText('Дворец Кёнбоккун')).toBeInTheDocument();
    expect(screen.getByText('Главный дворец')).toBeInTheDocument();
  });

  it('кнопка «Добавить место» вызывает onAddPlace с номером дня', async () => {
    const onAddPlace = vi.fn();
    render(<Timeline trip={tripWithPlace()} day={1} onAddPlace={onAddPlace} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Добавить место/i })[0]);
    expect(onAddPlace).toHaveBeenCalledWith(1);
  });

  it('кнопка удалить вызывает onDeletePlace с id', async () => {
    const onDeletePlace = vi.fn();
    const trip = tripWithPlace();
    render(<Timeline trip={trip} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={onDeletePlace} onSelectPlace={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Удалить Дворец Кёнбоккун/i }));
    expect(onDeletePlace).toHaveBeenCalledWith(trip.places[0].id);
  });

  it('пустой день показывает подсказку', () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    render(<Timeline trip={base} day={2} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    expect(screen.getByText(/пока ничего не запланировано/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- Timeline`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Создать `components/planner/PlaceCard.tsx`**

```tsx
'use client';

import type { Place, Category } from '@/lib/entities';
import { CatBadge, PriceBadge } from './badges';
import styles from './PlaceCard.module.css';

interface Props {
  place: Place;
  category: Category | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PlaceCard({ place, category, onSelect, onEdit, onDelete }: Props) {
  return (
    <div className={styles.item} role="button" tabIndex={0}
      aria-label={`${place.time ? place.time + ', ' : ''}${place.name}`}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(place.id); } }}>
      <div className={styles.time}>{place.time || ''}</div>
      <div className={styles.dot}>
        {place.image
          ? <img className={styles.thumb} src={place.image} alt={place.name} loading="lazy" />
          : <span aria-hidden="true">{place.photo}</span>}
      </div>
      <div className={styles.card}>
        <div className={styles.actions}>
          <button type="button" className={styles.act} aria-label={`Изменить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>✏️</button>
          <button type="button" className={styles.act} aria-label={`Удалить ${place.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}>🗑</button>
        </div>
        <div className={styles.name}>{place.name}</div>
        {place.desc && <div className={styles.desc}>{place.desc}</div>}
        <div className={styles.badges}><CatBadge category={category} /><PriceBadge price={place.price} /></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Создать `components/planner/PlaceCard.module.css`**

```css
.item { display: grid; grid-template-columns: 52px 28px 1fr; gap: 8px; align-items: start; padding: 6px 0; cursor: pointer; }
.time { font-size: 12px; color: var(--muted); text-align: right; padding-top: 14px; }
.dot { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin-top: 10px; border-radius: 50%; background: #eef0f6; overflow: hidden; }
.thumb { width: 100%; height: 100%; object-fit: cover; }
.card { position: relative; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; box-shadow: var(--shadow); }
.actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
.act { border: 0; background: transparent; font-size: 14px; line-height: 1; padding: 2px; border-radius: 6px; }
.act:hover { background: #f1f3f9; }
.name { font-weight: 700; font-size: 14px; color: var(--navy); padding-right: 48px; }
.desc { font-size: 13px; color: var(--muted); margin-top: 2px; }
.badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
```

- [ ] **Step 5: Создать `components/planner/Timeline.tsx`**

```tsx
'use client';

import { type TripDoc, getDay, getCategory, placesForDay, lastDayNumber } from '@/lib/entities';
import { PlaceCard } from './PlaceCard';
import styles from './Timeline.module.css';

interface Props {
  trip: TripDoc;
  day: number; // 0 = весь маршрут
  onAddPlace: (dayNumber: number) => void;
  onEditPlace: (id: string) => void;
  onDeletePlace: (id: string) => void;
  onSelectPlace: (id: string) => void;
}

export function Timeline({ trip, day, onAddPlace, onEditPlace, onDeletePlace, onSelectPlace }: Props) {
  const last = lastDayNumber(trip);
  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  return (
    <div className={styles.wrap}>
      {days.map((d) => {
        const places = placesForDay(trip, d.number);
        const cat = getCategory(trip, d.cat);
        return (
          <section key={d.number} className={styles.daySec}>
            <div className={styles.head}>
              <div className={styles.headTop}>
                <span className={styles.dlabel}>День {d.number} · {d.date}</span>
                <button type="button" className={styles.add} onClick={() => onAddPlace(d.number)}>＋ Добавить место</button>
              </div>
              <h3 className={styles.dtitle}>{d.title}</h3>
            </div>
            {places.length === 0
              ? <div className={styles.empty}>На этот день пока ничего не запланировано. Добавьте место кнопкой выше.</div>
              : places.map((p) => (
                  <PlaceCard key={p.id} place={p} category={getDay(trip, p.dayNumber ?? 0) ? cat : null}
                    onSelect={onSelectPlace} onEdit={onEditPlace} onDelete={onDeletePlace} />
                ))}
          </section>
        );
      })}
      {days.length === 0 && <div className={styles.empty}>Дни поездки ещё не сформированы.</div>}
      {last === 0 && null}
    </div>
  );
}
```

- [ ] **Step 6: Создать `components/planner/Timeline.module.css`**

```css
.wrap { padding: 16px; overflow-y: auto; }
.daySec { margin-bottom: 22px; }
.head { margin-bottom: 8px; }
.headTop { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dlabel { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.add { border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 700; }
.add:hover { background: var(--accent); color: #fff; }
.dtitle { margin: 4px 0 0; font-size: 17px; color: var(--navy); }
.empty { font-size: 13px; color: var(--muted); background: #fff; border: 1px dashed var(--line); border-radius: 10px; padding: 14px; }
```

- [ ] **Step 7: Запустить — убедиться, что проходит**

Run: `npm test -- Timeline`
Expected: PASS (4 теста).

- [ ] **Step 8: Commit**

```bash
git add components/planner/PlaceCard.tsx components/planner/PlaceCard.module.css components/planner/Timeline.tsx components/planner/Timeline.module.css components/planner/Timeline.test.tsx
git commit -m "feat: Timeline и PlaceCard — расписание дня с местами

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Валидация места (`lib/placeValidation.ts`)

**Files:**
- Create: `lib/placeValidation.ts`, `lib/placeValidation.test.ts`

- [ ] **Step 1: Написать тест**

`lib/placeValidation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validatePlace } from '@/lib/placeValidation';

describe('validatePlace', () => {
  it('пустое название → ошибка', () => {
    expect(validatePlace({ name: '', coords: [37, 127], time: '', desc: '', price: null, image: '' }).name).toBeTruthy();
  });
  it('нет точки на карте → ошибка', () => {
    expect(validatePlace({ name: 'Кафе', coords: null, time: '', desc: '', price: null, image: '' }).coords).toBeTruthy();
  });
  it('валидно → нет ошибок', () => {
    expect(validatePlace({ name: 'Кафе', coords: [37, 127], time: '', desc: '', price: null, image: '' })).toEqual({});
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- placeValidation`
Expected: FAIL.

- [ ] **Step 3: Реализовать `lib/placeValidation.ts`**

```ts
import type { PlaceInput } from '@/lib/entities';

export type PlaceErrors = Partial<Record<'name' | 'coords', string>>;

export function validatePlace(input: PlaceInput): PlaceErrors {
  const errors: PlaceErrors = {};
  if (!input.name.trim()) errors.name = 'Введите название места';
  if (!input.coords) errors.coords = 'Укажите точку на карте';
  return errors;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- placeValidation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/placeValidation.ts lib/placeValidation.test.ts
git commit -m "feat: validatePlace — валидация формы места

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Форма места (`components/planner/PlaceForm.tsx`)

**Files:**
- Create: `components/planner/PlaceForm.tsx`, `components/planner/PlaceForm.module.css`
- Test: `components/planner/PlaceForm.test.tsx`

**Контракт компонента:** форма управляет полями `name/time/desc/price/image` внутри;
координаты подняты в родителя (их задаёт карта), приходят пропом `coords`, кнопка
«Указать точку на карте» вызывает `onPickCoords`. `onSubmit(input)` отдаёт полный
`PlaceInput` (включая `coords` из пропа). Валидация — через `validatePlace`.

- [ ] **Step 1: Написать тест**

`components/planner/PlaceForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaceForm } from '@/components/planner/PlaceForm';

describe('PlaceForm', () => {
  it('показывает ошибки при пустой отправке', async () => {
    const onSubmit = vi.fn();
    render(<PlaceForm coords={null} onSubmit={onSubmit} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(screen.getByText('Введите название места')).toBeInTheDocument();
    expect(screen.getByText('Укажите точку на карте')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('отправляет данные при валидной форме', async () => {
    const onSubmit = vi.fn();
    render(<PlaceForm coords={[37.5, 127]} onSubmit={onSubmit} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    await userEvent.type(screen.getByLabelText('Название'), 'Кафе');
    await userEvent.type(screen.getByLabelText('Время'), '10:00');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Кафе', time: '10:00', coords: [37.5, 127] }));
  });

  it('кнопка указания точки вызывает onPickCoords', async () => {
    const onPickCoords = vi.fn();
    render(<PlaceForm coords={null} onSubmit={vi.fn()} onCancel={vi.fn()} onPickCoords={onPickCoords} busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Указать точку на карте/i }));
    expect(onPickCoords).toHaveBeenCalled();
  });

  it('предзаполняется из initial при редактировании', () => {
    render(<PlaceForm coords={[37.5, 127]} onSubmit={vi.fn()} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false}
      initial={{ name: 'Парк', coords: [37.5, 127], time: '12:00', desc: 'тихо', price: 'free', image: '' }} />);
    expect(screen.getByLabelText('Название')).toHaveValue('Парк');
    expect(screen.getByLabelText('Время')).toHaveValue('12:00');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- PlaceForm`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Создать `components/planner/PlaceForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { PlaceInput, PlacePrice, Coords } from '@/lib/entities';
import { validatePlace, type PlaceErrors } from '@/lib/placeValidation';
import styles from './PlaceForm.module.css';

interface Props {
  coords: Coords | null;            // текущая точка (задаётся картой в родителе)
  onSubmit: (input: PlaceInput) => void;
  onCancel: () => void;
  onPickCoords: () => void;         // включить режим выбора точки на карте
  busy: boolean;
  initial?: PlaceInput;             // для редактирования
}

const PRICES: { value: PlacePrice; label: string }[] = [
  { value: null, label: '—' },
  { value: 'free', label: 'Бесплатно' },
  { value: 1, label: '₽' },
  { value: 2, label: '₽₽' },
  { value: 3, label: '₽₽₽' },
];

export function PlaceForm({ coords, onSubmit, onCancel, onPickCoords, busy, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [price, setPrice] = useState<PlacePrice>(initial?.price ?? null);
  const [image, setImage] = useState(initial?.image ?? '');
  const [errors, setErrors] = useState<PlaceErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: PlaceInput = { name, coords, time, desc, price, image };
    const found = validatePlace(input);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(input);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.h2}>{initial ? 'Изменить место' : 'Новое место'}</h2>

      <label className={styles.label} htmlFor="pf-name">Название</label>
      <input id="pf-name" className={styles.input} value={name} disabled={busy}
        onChange={(e) => setName(e.target.value)} />
      {errors.name && <div className={styles.err}>{errors.name}</div>}

      <div className={styles.coordRow}>
        <button type="button" className={styles.pick} onClick={onPickCoords} disabled={busy}>
          📍 Указать точку на карте
        </button>
        <span className={styles.coordVal}>{coords ? `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}` : 'точка не задана'}</span>
      </div>
      {errors.coords && <div className={styles.err}>{errors.coords}</div>}

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="pf-time">Время</label>
          <input id="pf-time" type="time" className={styles.input} value={time} disabled={busy}
            onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label className={styles.label} htmlFor="pf-price">Цена</label>
          <select id="pf-price" className={styles.input} value={price === null ? '' : String(price)} disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              setPrice(v === '' ? null : v === 'free' ? 'free' : (Number(v) as PlacePrice));
            }}>
            {PRICES.map((p) => <option key={String(p.value)} value={p.value === null ? '' : String(p.value)}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <label className={styles.label} htmlFor="pf-desc">Описание</label>
      <textarea id="pf-desc" className={styles.textarea} value={desc} disabled={busy}
        onChange={(e) => setDesc(e.target.value)} rows={3} />

      <label className={styles.label} htmlFor="pf-image">Фото (ссылка)</label>
      <input id="pf-image" className={styles.input} value={image} disabled={busy} placeholder="https://…"
        onChange={(e) => setImage(e.target.value)} />

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>Отмена</button>
        <button type="submit" className={styles.save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Создать `components/planner/PlaceForm.module.css`**

```css
.form { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 18px; box-shadow: var(--shadow); }
.h2 { margin: 0 0 14px; font-size: 18px; color: var(--navy); }
.label { display: block; font-size: 12px; color: var(--navy); font-weight: 600; margin: 10px 0 4px; }
.input, .textarea { width: 100%; border: 1px solid #d4d8e6; border-radius: 9px; padding: 10px 12px; font-size: 14px; background: #fafbff; font-family: inherit; }
.input:focus, .textarea:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
.textarea { resize: vertical; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.coordRow { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.pick { border: 1px solid var(--navy); color: var(--navy); background: transparent; border-radius: 9px; padding: 9px 12px; font-size: 13px; font-weight: 600; }
.pick:hover { background: var(--navy); color: #fff; }
.coordVal { font-size: 12px; color: var(--muted); }
.err { color: var(--accent); font-size: 12px; margin-top: 4px; }
.actions { display: flex; gap: 10px; margin-top: 18px; }
.cancel { flex: 0 0 auto; border: 1px solid var(--line); background: #fff; color: var(--navy); border-radius: 9px; padding: 11px 18px; font-weight: 600; }
.save { flex: 1; border: 0; background: var(--accent); color: #fff; border-radius: 9px; padding: 11px; font-weight: 700; }
.save:disabled, .cancel:disabled { opacity: .6; }
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npm test -- PlaceForm`
Expected: PASS (4 теста).

- [ ] **Step 6: Commit**

```bash
git add components/planner/PlaceForm.tsx components/planner/PlaceForm.module.css components/planner/PlaceForm.test.tsx
git commit -m "feat: PlaceForm — форма добавления/редактирования места

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Карта (`components/planner/TripMap.tsx` + Leaflet)

**Files:**
- Modify: `package.json` (зависимости)
- Create: `components/planner/TripMap.tsx`, `components/planner/TripMap.module.css`

> Юнит-тест не пишем (Leaflet требует реального DOM-окружения карты) — проверяется сборкой и ручной проверкой в Task 11.

- [ ] **Step 1: Установить Leaflet**

Run: `npm install leaflet@1.9.4 && npm install -D @types/leaflet@1.9.12`
Expected: пакеты добавлены в `package.json`, установка без ошибок.

- [ ] **Step 2: Создать `components/planner/TripMap.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type TripDoc, getCategory, placesForDay, allDayPlaces, lastDayNumber, type Coords } from '@/lib/entities';
import styles from './TripMap.module.css';

interface Props {
  trip: TripDoc;
  day: number;             // 0 = весь маршрут
  picking: boolean;        // режим выбора точки
  draftCoords: Coords | null;
  onMapClick: (coords: Coords) => void;
  onPlaceClick: (id: string) => void;
}

function pinIcon(label: string | number) {
  return L.divIcon({
    className: '',
    html: `<div class="${styles.pin}"><span>${label}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30],
  });
}

export function TripMap({ trip, day, picking, draftCoords, onMapClick, onPlaceClick }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const clickCb = useRef(onMapClick);
  clickCb.current = onMapClick;
  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const placeCb = useRef(onPlaceClick);
  placeCb.current = onPlaceClick;

  // инициализация карты один раз
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([37.56, 126.99], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    draftLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingRef.current) clickCb.current([e.latlng.lat, e.latlng.lng]);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // курсор в режиме выбора
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = picking ? 'crosshair' : '';
  }, [picking]);

  // черновая точка
  useEffect(() => {
    const layer = draftLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (draftCoords) {
      L.marker(draftCoords, {
        icon: L.divIcon({ className: '', html: `<div class="${styles.pin} ${styles.draft}"><span>+</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] }),
      }).addTo(layer);
    }
  }, [draftCoords]);

  // маркеры и маршрут
  useEffect(() => {
    const map = mapRef.current;
    const mLayer = markerLayer.current;
    const rLayer = routeLayer.current;
    if (!map || !mLayer || !rLayer) return;
    mLayer.clearLayers();
    rLayer.clearLayers();

    const order = placesForDay(trip, day).filter((p) => p.coords);
    const shown = (day === 0 ? allDayPlaces(trip) : placesForDay(trip, day)).filter((p) => p.coords);

    shown.forEach((p) => {
      const label = day === 0 ? (p.dayNumber ?? '') : order.indexOf(p) + 1;
      const m = L.marker(p.coords as Coords, { icon: pinIcon(label) });
      m.bindPopup(`<b>${p.name}</b>${p.time ? ' · ' + p.time : ''}${p.desc ? '<br>' + p.desc : ''}`);
      m.on('click', () => placeCb.current(p.id));
      m.addTo(mLayer);
    });

    const last = lastDayNumber(trip);
    if (day === 0) {
      const pts = trip.places.filter((p) => (p.dayNumber ?? 0) >= 1 && (p.dayNumber ?? 0) < last && p.coords).map((p) => p.coords as Coords);
      if (pts.length > 1) L.polyline(pts, { color: '#0f1b3d', weight: 3, opacity: 0.5, dashArray: '7 9' }).addTo(rLayer);
    } else {
      const pts = order.map((p) => p.coords as Coords);
      if (pts.length > 1) {
        const col = getCategory(trip, trip.days.find((d) => d.number === day)?.cat ?? null)?.color;
        L.polyline(pts, { color: col || '#0f1b3d', weight: 4, opacity: 0.75 }).addTo(rLayer);
      }
    }

    const bounds = shown.map((p) => p.coords as Coords);
    if (bounds.length) {
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(L.latLngBounds(bounds).pad(0.18), { animate });
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [trip, day]);

  return <div ref={elRef} className={styles.map} aria-label="Карта поездки" />;
}
```

- [ ] **Step 3: Создать `components/planner/TripMap.module.css`**

```css
.map { width: 100%; height: 100%; min-height: 320px; }
.pin :global(span), .pin { display: flex; }
.pin { align-items: center; justify-content: center; width: 34px; height: 34px; background: var(--accent); color: #fff; font-weight: 700; font-size: 13px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.pin span { transform: rotate(45deg); }
.draft { background: var(--navy); }
```

(Примечание: `:global` нужен, чтобы CSS-модульные классы достигали HTML внутри Leaflet `divIcon`, который вставляется вне React. Класс `styles.pin` передаётся в `html` строкой — CSS-модуль хеширует имя, и оно совпадает.)

- [ ] **Step 4: Проверка сборки**

Run: `npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/planner/TripMap.tsx components/planner/TripMap.module.css
git commit -m "feat: TripMap — карта Leaflet (маркеры, маршрут, выбор точки)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Страница планировщика (`/app/trip/`) + связывание

**Files:**
- Create: `app/app/trip/page.tsx`, `app/app/trip/page.module.css`
- Modify: `app/app/page.tsx` (строка `onOpen`)

- [ ] **Step 1: Изменить `onOpen` в `app/app/page.tsx`**

Заменить строку 37:
```tsx
        onOpen={() => router.push('/app/new?soon=1')}
```
на:
```tsx
        onOpen={(id) => router.push(`/app/trip/?id=${id}`)}
```

- [ ] **Step 2: Создать `app/app/trip/page.module.css`**

```css
.layout { display: grid; grid-template-columns: minmax(360px, 1fr) 1fr; height: calc(100vh - 56px - 73px); }
.left { overflow-y: auto; border-right: 1px solid var(--line); background: var(--bg); position: relative; }
.right { position: relative; }
.formWrap { position: absolute; inset: 0; background: rgba(15,27,61,.35); display: flex; align-items: flex-start; justify-content: center; padding: 18px; overflow-y: auto; z-index: 500; }
.formInner { width: 100%; max-width: 460px; }
.loading { padding: 80px; text-align: center; color: var(--muted); }
.notfound { padding: 60px 24px; text-align: center; color: var(--muted); }
.notfound a { color: var(--accent); font-weight: 700; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; height: auto; } .right { height: 60vh; } }
```

- [ ] **Step 3: Создать `app/app/trip/page.tsx`**

```tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { getTrip, updateTrip } from '@/lib/trips';
import {
  type TripDoc, type Coords, type PlaceInput,
  ensureDays, addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip,
} from '@/lib/entities';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { DayTabs } from '@/components/planner/DayTabs';
import { Timeline } from '@/components/planner/Timeline';
import { PlaceForm } from '@/components/planner/PlaceForm';
import styles from './page.module.css';

const TripMap = dynamic(() => import('@/components/planner/TripMap').then((m) => m.TripMap), { ssr: false });

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; dayNumber: number }
  | { mode: 'edit'; id: string };

function PlannerInner() {
  const router = useRouter();
  const session = useSession();
  const params = useSearchParams();
  const id = params.get('id') ?? '';

  const [trip, setTrip] = useState<TripDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [draftCoords, setDraftCoords] = useState<Coords | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed' || !id) return;
    getTrip(getSupabase(), id).then(async (t) => {
      if (!t) { setNotFound(true); return; }
      const fixed = ensureDays(t);
      if (fixed !== t) await updateTrip(getSupabase(), fixed);
      setTrip(fixed);
    }).catch(() => setNotFound(true));
  }, [session.status, id, router]);

  async function persist(next: TripDoc) {
    setBusy(true);
    try {
      await updateTrip(getSupabase(), next);
      setTrip(next);
      setForm({ mode: 'closed' });
      setPicking(false);
      setDraftCoords(null);
    } catch {
      alert('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(input: PlaceInput) {
    if (!trip) return;
    if (form.mode === 'add') persist(addPlaceToTrip(trip, form.dayNumber, input));
    else if (form.mode === 'edit') persist(updatePlaceInTrip(trip, form.id, { ...input }));
  }

  function handleDelete(placeId: string) {
    if (!trip) return;
    if (confirm('Удалить это место?')) persist(removePlaceFromTrip(trip, placeId));
  }

  function openAdd(dayNumber: number) {
    setDraftCoords(null);
    setForm({ mode: 'add', dayNumber });
  }
  function openEdit(placeId: string) {
    const p = trip?.places.find((x) => x.id === placeId);
    setDraftCoords(p?.coords ?? null);
    setForm({ mode: 'edit', id: placeId });
  }
  function closeForm() { setForm({ mode: 'closed' }); setPicking(false); setDraftCoords(null); }

  if (notFound) {
    return <div className={styles.notfound}>Поездка не найдена. <a href="/app">← Мои поездки</a></div>;
  }
  if (session.status !== 'authed' || !trip) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  const editing = form.mode === 'edit' ? trip.places.find((p) => p.id === form.id) : undefined;
  const initial: PlaceInput | undefined = editing
    ? { name: editing.name, coords: editing.coords, time: editing.time, desc: editing.desc, price: editing.price, image: editing.image }
    : undefined;

  return (
    <main>
      <PlannerHeader title={trip.title} startDate={trip.startDate} endDate={trip.endDate} />
      <DayTabs days={trip.days} categories={trip.categories} activeDay={activeDay} onSelect={setActiveDay} />
      <div className={styles.layout}>
        <div className={styles.left}>
          <Timeline trip={trip} day={activeDay}
            onAddPlace={openAdd} onEditPlace={openEdit} onDeletePlace={handleDelete}
            onSelectPlace={() => { /* выбор места — на будущее (центрирование карты) */ }} />
          {form.mode !== 'closed' && (
            <div className={styles.formWrap}>
              <div className={styles.formInner}>
                <PlaceForm
                  key={form.mode === 'edit' ? form.id : 'add'}
                  coords={draftCoords}
                  initial={initial}
                  busy={busy}
                  onSubmit={handleSubmit}
                  onCancel={closeForm}
                  onPickCoords={() => setPicking(true)}
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.right}>
          <TripMap trip={trip} day={activeDay} picking={picking} draftCoords={draftCoords}
            onMapClick={(c) => { setDraftCoords(c); setPicking(false); }}
            onPlaceClick={openEdit} />
        </div>
      </div>
    </main>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Загрузка…</div>}>
      <PlannerInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Прогнать все тесты и сборку**

Run: `npm test && npm run build`
Expected: все тесты PASS; сборка успешна; существует `out/app/trip/index.html`.

- [ ] **Step 5: Ручная проверка в dev**

Run: `npm run dev`, открыть существующую поездку из «Мои поездки».
Expected: видны дни; клик «＋ Добавить место» → форма; «Указать точку на карте» → клик по карте ставит точку; «Сохранить» → место в расписании и на карте; перезагрузка сохраняет; ✏️ редактирует, 🗑 удаляет.

- [ ] **Step 6: Commit + деплой**

```bash
git add app/app/trip/page.tsx app/app/trip/page.module.css app/app/page.tsx
git commit -m "feat: экран открытия поездки — дни, карта, добавление/редактирование мест

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

(Cron на сервере подхватит изменение `main` и пересоберёт сайт.)

- [ ] **Step 7: Проверка боевого сайта**

После пересборки (≈2–5 мин) проверить:
```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://tripsplan.ru/app/trip/
```
Expected: `200`. Открыть поездку на боевом сайте, добавить место, перезагрузить — место на месте.

---

## Самопроверка плана (выполнено автором)

- **Покрытие спека:** маршрут `/app/trip/?id=` (Task 11), автогенерация дней (`buildDays` в Task 1, `ensureDays` в Task 2, применение в Task 11), вкладки дней (Task 6), расписание+карточки (Task 7), карта с маркерами/маршрутом/выбором точки (Task 10), добавление/редактирование/удаление+сохранение (Task 9+11, `getTrip`/`updateTrip` Task 3, мутации Task 2), валидация места (Task 8), бейджи (Task 4), шапка (Task 5). Все 8 критериев готовности имеют задачи.
- **Плейсхолдеры:** отсутствуют — в каждом шаге реальный код/команды.
- **Согласованность типов:** `Day`/`Place`/`PlaceInput`/`Coords`/`PlacePrice` определены в Task 2 и используются всюду одинаково; `placesForDay/getDay/getCategory/allDayPlaces/lastDayNumber` — единые имена; `addPlaceToTrip(trip, dayNumber, input)`, `updatePlaceInTrip(trip, id, patch)`, `removePlaceFromTrip(trip, id)`, `ensureDays(trip)` согласованы между Task 2, тестами и страницей; `getTrip`/`updateTrip` (Task 3) вызываются в Task 11; `validatePlace` (Task 8) — в PlaceForm (Task 9); пропсы `DayTabs`/`Timeline`/`PlaceForm`/`TripMap` совпадают между тестами, компонентами и страницей.
- **Открытые вопросы:** drag-and-drop, настройка дня, ссылки, ИИ — намеренно вне MVP (следующие итерации).
```
