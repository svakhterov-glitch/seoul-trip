/* ============================================================
   СУЩНОСТИ И ФАБРИКИ
   Здесь описана форма данных продукта и функции их создания.
   Любой код, создающий поездку/место/ссылку, идёт через эти
   фабрики — так структура данных остаётся единой во всём проекте.
   ============================================================ */

/* генератор простых уникальных id */
let _seq = 0;
export function uid(prefix = "id") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
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
 * cat — категория (см. CATS). mode — как наполнялся:
 * 'ai' | 'manual' | 'links' | null.
 */
export function createDay(data = {}) {
  return {
    number: data.number,
    date: data.date || "",
    cat: data.cat || null,
    title: data.title || "",
    sub: data.sub || "",
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
    type: data.type || null,            // 'hotel' | 'airport' | null
    name: data.name || "",
    coords: data.coords || null,        // [lat, lng]
    time: data.time || "",              // 'ЧЧ:ММ'
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
    travelers: data.travelers || "",   // 'Сергей & Полина' (необязательно)
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

/* индексы мест дня, отсортированные по времени */
export function placesForDay(trip, dayNumber) {
  return trip.places
    .filter((p) => p.dayNumber === dayNumber)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

/* все «дневные» места (1..последний день), для обзорной карты */
export function allDayPlaces(trip) {
  const last = lastDayNumber(trip);
  return trip.places.filter((p) => p.dayNumber >= 1 && p.dayNumber <= last);
}

export function lastDayNumber(trip) {
  return trip.days.reduce((m, d) => Math.max(m, d.number), 0);
}
