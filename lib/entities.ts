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

export interface PlaceKind {
  key: string;
  label: string;
  emoji: string;
}

/** Форматы места (музей, кафе, природа…). Расширяемый набор. */
export const PLACE_KINDS: PlaceKind[] = [
  { key: 'food', label: 'Кафе/ресторан', emoji: '🍽️' },
  { key: 'museum', label: 'Музей/галерея', emoji: '🏛️' },
  { key: 'nature', label: 'Природа/парк', emoji: '🌳' },
  { key: 'sight', label: 'Достопримечательность', emoji: '📸' },
  { key: 'shop', label: 'Шопинг', emoji: '🛍️' },
  { key: 'fun', label: 'Развлечения', emoji: '🎡' },
  { key: 'bar', label: 'Бар/ночная жизнь', emoji: '🍸' },
  { key: 'hotel', label: 'Отель/жильё', emoji: '🛏️' },
  { key: 'transport', label: 'Транспорт', emoji: '🚇' },
  { key: 'other', label: 'Другое', emoji: '📍' },
];

export function getPlaceKind(key: string): PlaceKind | null {
  return PLACE_KINDS.find((k) => k.key === key) || null;
}

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
  /** Кто нашёл место (имя спутника). */
  by: string;
  /** Формат места (ключ из PLACE_KINDS). */
  kind: string;
  /** Доп. комментарий — зачем добавили. */
  note: string;
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
  by?: string;
  kind?: string;
  note?: string;
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
  /** Спутники: с кем едем (список имён). */
  companions: string[];
  /** Ссылка на картинку-обложку этой поездки (перебивает дефолт города). */
  coverImage: string;
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
    by: data.by || '',
    kind: data.kind || '',
    note: data.note || '',
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
    companions: [],
    coverImage: '',
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

/**
 * Привести старую поездку к актуальной форме: догенерировать дни и проставить
 * недостающие поля (companions). Возвращает тот же объект, если всё на месте.
 */
export function ensureTripDefaults(trip: TripDoc): TripDoc {
  const days = Array.isArray(trip.days) ? trip.days : [];
  const needDays = days.length === 0;
  const needCompanions = !Array.isArray(trip.companions);
  const needCover = typeof trip.coverImage !== 'string';
  if (!needDays && !needCompanions && !needCover) return trip;
  return {
    ...trip,
    days: needDays ? buildDays(trip.startDate, trip.endDate) : days,
    companions: needCompanions ? [] : trip.companions,
    coverImage: needCover ? '' : trip.coverImage,
  };
}

/** Поля обложки, редактируемые пользователем. */
export interface TripMetaPatch {
  title?: string;
  lead?: string;
  companions?: string[];
  coverImage?: string;
}

/** Иммутабельно обновить мету поездки (название/описание/спутники). */
export function updateTripMeta(trip: TripDoc, patch: TripMetaPatch): TripDoc {
  return { ...trip, ...patch };
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

/**
 * Переместить место — внутри дня (смена порядка) или в другой день.
 * `targetIndex` — позиция среди мест целевого дня (0..n, клампится). Иммутабельно
 * перенумеровывает `order` (0,1,2…) у затронутых дней и проставляет `dayNumber`.
 * Используется drag-and-drop и клавиатурным переносом в `Timeline`.
 */
export function movePlace(trip: TripDoc, placeId: string, targetDay: number, targetIndex: number): TripDoc {
  const moving = trip.places.find((p) => p.id === placeId);
  if (!moving) return trip;
  const fromDay = moving.dayNumber;

  // Порядок id целевого дня без перемещаемого места + вставка на нужную позицию.
  const targetIds = placesForDay(trip, targetDay).map((p) => p.id).filter((id) => id !== placeId);
  const idx = Math.max(0, Math.min(targetIndex, targetIds.length));
  targetIds.splice(idx, 0, placeId);
  const orderInTarget = new Map(targetIds.map((id, i) => [id, i] as const));

  // При переносе между днями перенумеровать и исходный день (он «схлопывается»).
  const crossDay = fromDay !== targetDay && fromDay != null;
  const fromOrder = crossDay
    ? new Map(placesForDay(trip, fromDay).map((p) => p.id).filter((id) => id !== placeId).map((id, i) => [id, i] as const))
    : null;

  return {
    ...trip,
    places: trip.places.map((p) => {
      if (p.id === placeId) return { ...p, dayNumber: targetDay, order: orderInTarget.get(p.id)! };
      if (orderInTarget.has(p.id)) return { ...p, order: orderInTarget.get(p.id)! };
      if (fromOrder?.has(p.id)) return { ...p, order: fromOrder.get(p.id)! };
      return p;
    }),
  };
}

/** Иммутабельно обновить день (название/категория/тема). */
export function updateDay(trip: TripDoc, dayNumber: number, patch: Partial<Day>): TripDoc {
  return {
    ...trip,
    days: trip.days.map((d) => (d.number === dayNumber ? { ...d, ...patch } : d)),
  };
}

/** Добавить новую категорию дня. Возвращает обновлённую поездку и ключ категории. */
export function addCategory(trip: TripDoc, input: { label: string; color: string }): { trip: TripDoc; key: string } {
  const key = newId('cat');
  const category: Category = { key, label: input.label.trim(), color: input.color };
  return { trip: { ...trip, categories: [...trip.categories, category] }, key };
}
