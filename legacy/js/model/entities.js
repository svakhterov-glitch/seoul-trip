/* ============================================================
   СУЩНОСТИ И ФАБРИКИ
   Здесь описана форма данных продукта и функции их создания.
   Любой код, создающий поездку/место/ссылку, идёт через эти
   фабрики — так структура данных остаётся единой во всём проекте.
   ============================================================ */

import { DEFAULT_CATEGORIES } from "./config.js";

/* генератор простых уникальных id */
let _seq = 0;
export function uid(prefix = "id") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

/** Категория дня: ключ, подпись, цвет (HEX). */
export function createCategory(data = {}) {
  return {
    key: data.key || uid("cat"),
    label: data.label || "",
    color: data.color || "#6b7385",
  };
}

/**
 * Перелёт.
 * direction: 'out' (туда) | 'back' (обратно)
 */
export function createFlight(data = {}) {
  return {
    direction: data.direction || "out",
    airline: data.airline || "",
    from: data.from || "",          // 'SVO Шереметьево'
    to: data.to || "",              // 'ICN Инчхон'
    date: data.date || "",          // 'YYYY-MM-DD' (отображаемая дата)
    dateLabel: data.dateLabel || "",// '7 июн' — короткая подпись для шапки
    depart: data.depart || "",      // '17:30'
    arrive: data.arrive || "",      // '11:35'
    durationText: data.durationText || "",
    layoverText: data.layoverText || "",
  };
}

/**
 * День маршрута. number: 1..N. date — дата дня.
 * cat — ключ категории (trip.categories). mode — как наполнялся:
 * 'ai' | 'manual' | 'links' | null.
 */
export function createDay(data = {}) {
  return {
    number: data.number,
    date: data.date || "",
    cat: data.cat || null,
    title: data.title || "",
    sub: data.sub || "",
    start: data.start || "",   // начало дня 'ЧЧ:ММ' (необязательно)
    end: data.end || "",       // конец дня 'ЧЧ:ММ' (необязательно)
    mode: data.mode || null,
  };
}

/**
 * Место маршрута.
 * source: 'seed' | 'manual' | 'ai' | 'link' — откуда взялось.
 */
export function createPlace(data = {}) {
  return {
    id: data.id || uid("place"),
    dayNumber: data.dayNumber ?? null,  // null = ещё не назначено в день
    order: data.order ?? null,          // порядок внутри дня (ручной)
    type: data.type || null,            // 'hotel' | 'airport' | null
    name: data.name || "",
    coords: data.coords || null,        // [lat, lng]
    image: data.image || "",            // URL фотографии (необязательно)
    time: data.time || "",              // 'ЧЧ:ММ' (необязательно)
    photo: data.photo || "📍",
    price: data.price ?? null,          // 'free' | 1 | 2 | 3 | null
    by: data.by || "Оба",               // 'Сергей' | 'Полина' | 'Оба'
    desc: data.desc || "",
    history: data.history || "",
    source: data.source || "manual",
    sourceUrl: data.sourceUrl || "",
  };
}

/**
 * Ссылка из «инбокса» (окно ссылок).
 * status: 'unsorted' (не разобрана) | 'placed' (превращена в место).
 */
export function createInboxLink(data = {}) {
  return {
    id: data.id || uid("link"),
    url: data.url || "",
    status: data.status || "unsorted",
    parsedName: data.parsedName || "",
    parsedCoords: data.parsedCoords || null,
    parsedPhoto: data.parsedPhoto || "🔗",
    placedAsPlaceId: data.placedAsPlaceId || null,
  };
}

/**
 * Поездка — корневая сущность.
 * Хранит перелёты, отель, дни (каркас календаря), места и инбокс ссылок.
 */
export function createTrip(data = {}) {
  return {
    id: data.id || uid("trip"),
    title: data.title || "",
    city: data.city || "",
    country: data.country || "",       // для подписи-«надзаголовка»
    startDate: data.startDate || "",   // 'YYYY-MM-DD'
    endDate: data.endDate || "",
    lead: data.lead || "",             // вводный абзац под заголовком
    note: data.note || "",             // личная заметка (необязательно)
    cover: data.cover || "",           // URL обложки (фон шапки)
    travelers: data.travelers || "",   // 'Сергей & Полина' — устаревшее, см. people
    people: data.people || [],         // ['Сергей','Полина'] — питает «кто нашёл»
    currency: data.currency || "₩",    // символ/код валюты для цен
    budget: data.budget ?? null,       // общий бюджет (число) или null
    interests: data.interests || [],   // ['еда','искусство'] — для ИИ-генерации
    pace: data.pace || "",             // 'relaxed' | 'moderate' | 'packed'
    categories: (data.categories?.length ? data.categories : DEFAULT_CATEGORIES).map(createCategory),
    hotel: data.hotel || null,         // { name, coords:[lat,lng] }
    flights: (data.flights || []).map(createFlight),
    days: (data.days || []).map(createDay),
    places: (data.places || []).map(createPlace),
    inbox: (data.inbox || []).map(createInboxLink),
  };
}

/* ---------- помощники чтения ---------- */

export function getDay(trip, number) {
  return trip.days.find((d) => d.number === number) || null;
}

/* категория поездки по ключу (или null) */
export function getCategory(trip, key) {
  if (!key) return null;
  return trip.categories.find((c) => c.key === key) || null;
}

/* участники поездки: из people, иначе разобрать travelers */
export function tripPeople(trip) {
  if (trip.people?.length) return trip.people;
  if (!trip.travelers) return [];
  return trip.travelers.split(/&|,|\sи\s/).map((s) => s.trim()).filter(Boolean);
}

/* варианты для поля «кто нашёл место»: участники + «Вместе» */
export function byOptions(trip) {
  return [...tripPeople(trip), "Вместе"];
}

/* места дня в ручном порядке (поле order); время — лишь подпись.
   Места без order уходят в конец, между равными — по времени. */
export function placesForDay(trip, dayNumber) {
  return trip.places
    .filter((p) => p.dayNumber === dayNumber)
    .sort((a, b) => {
      const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
      if (ao !== bo) return ao - bo;
      return (a.time || "").localeCompare(b.time || "");
    });
}

/* Привести порядок мест к последовательным целым (0,1,2,…) по каждому дню.
   Зафиксированные (отель/аэропорт) не трогаем — они держат свою позицию.
   Для seed-мест без order это даёт порядок по времени (исходный план). */
export function normalizeDayOrders(trip) {
  const last = lastDayNumber(trip);
  for (let d = 1; d <= last; d++) {
    const ps = trip.places
      .filter((p) => p.dayNumber === d && p.type !== "hotel" && p.type !== "airport")
      .sort((a, b) => {
        const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
        if (ao !== bo) return ao - bo;
        return (a.time || "").localeCompare(b.time || "");
      });
    ps.forEach((p, i) => { p.order = i; });
  }
  return trip;
}

/* все «дневные» места (1..последний день), для обзорной карты */
export function allDayPlaces(trip) {
  const last = lastDayNumber(trip);
  return trip.places.filter((p) => p.dayNumber >= 1 && p.dayNumber <= last);
}

export function lastDayNumber(trip) {
  return trip.days.reduce((m, d) => Math.max(m, d.number), 0);
}
