/* ============================================================
   STORE · состояние приложения
   Держит текущую поездку и UI-состояние (активный день) в памяти,
   уведомляет подписчиков об изменениях и сохраняет данные через
   Repository. UI читает состояние отсюда и вызывает действия —
   но никогда не трогает хранилище напрямую.
   ============================================================ */

import { uid, createPlace, createInboxLink, normalizeDayOrders } from "../model/entities.js";
import { addDays, formatDateRu } from "../model/days.js";

/* максимальный order среди мест дня (без отеля/аэропорта); -1 если пусто */
function maxOrderInDay(trip, dayNumber) {
  return trip.places
    .filter((p) => p.dayNumber === dayNumber && p.type !== "hotel" && p.type !== "airport")
    .reduce((m, p) => Math.max(m, p.order ?? -1), -1);
}

export class Store {
  /** @param {Repository} repo @param {Trip} trip */
  constructor(repo, trip) {
    this.repo = repo;
    this.trip = normalizeDayOrders(trip);
    this.activeDay = 0; // 0 = обзор «весь маршрут»
    this._subs = new Set();
  }

  /* ---------- подписка ---------- */
  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }
  _emit() {
    this._subs.forEach((fn) => fn(this));
  }

  /* сохранить поездку и уведомить подписчиков */
  async _commit() {
    await this.repo.saveTrip(this.trip);
    this._emit();
  }

  /* ---------- чтение ---------- */
  getTrip() { return this.trip; }
  getActiveDay() { return this.activeDay; }

  /* переключиться на другую поездку (показываем её обзор) */
  loadTrip(trip) {
    this.trip = normalizeDayOrders(trip);
    this.activeDay = 0;
    this._emit();
  }

  /* ---------- UI-действия ---------- */
  setActiveDay(day) {
    this.activeDay = day;
    this._emit(); // смена дня не пишется в хранилище
  }

  /* ---------- мутации данных (для Этапов 2–4) ---------- */

  /* настройки дня: категория, начало/конец, заголовок, тема */
  async updateDay(number, patch) {
    const d = this.trip.days.find((x) => x.number === number);
    if (d) Object.assign(d, patch);
    await this._commit();
  }

  /* заменить набор категорий поездки */
  async setCategories(categories) {
    this.trip.categories = categories;
    await this._commit();
  }

  /* обновить переменные поездки (страница «Настройки поездки»).
     При смене даты начала пересчитываем подписи дат у дней. */
  async updateTrip(patch) {
    const oldStart = this.trip.startDate;
    Object.assign(this.trip, patch);
    if (patch.startDate && patch.startDate !== oldStart) {
      this.trip.days.forEach((d, i) => { d.date = formatDateRu(addDays(patch.startDate, i)); });
    }
    await this._commit();
  }

  async addPlace(data) {
    const place = createPlace({ ...data, id: uid("place") });
    // новое место — в конец своего дня
    if (place.order == null) place.order = maxOrderInDay(this.trip, place.dayNumber) + 1;
    this.trip.places.push(place);
    await this._commit();
    return place;
  }

  async updatePlace(id, patch) {
    const p = this.trip.places.find((x) => x.id === id);
    if (p) {
      // смена дня через форму → в конец нового дня
      if (patch.dayNumber != null && patch.dayNumber !== p.dayNumber) {
        patch = { ...patch, order: maxOrderInDay(this.trip, patch.dayNumber) + 1 };
      }
      Object.assign(p, patch);
    }
    await this._commit();
  }

  async removePlace(id) {
    this.trip.places = this.trip.places.filter((x) => x.id !== id);
    await this._commit();
  }

  /* перенос места в КОНЕЦ другого дня со сбросом времени (drop на вкладку дня) */
  async moveToDayEnd(id, dayNumber) {
    const p = this.trip.places.find((x) => x.id === id);
    if (p && p.type !== "hotel" && p.type !== "airport") {
      if (p.dayNumber !== dayNumber) p.time = ""; // переехало в другой день — время сбрасываем
      p.dayNumber = dayNumber;
      p.order = maxOrderInDay(this.trip, dayNumber) + 1;
    }
    await this._commit();
  }

  /* задать ручной порядок мест дня (drag-and-drop внутри/между днями).
     Место, переехавшее из другого дня, теряет время. */
  async setDayOrder(dayNumber, orderedIds) {
    orderedIds.forEach((id, i) => {
      const p = this.trip.places.find((x) => x.id === id);
      if (!p) return;
      if (p.dayNumber !== dayNumber) p.time = "";
      p.dayNumber = dayNumber;
      p.order = i;
    });
    await this._commit();
  }

  /* ---------- инбокс ссылок (Этап 3) ---------- */

  async addLink(url, parsed = {}) {
    const link = createInboxLink({ url, ...parsed });
    this.trip.inbox.push(link);
    await this._commit();
    return link;
  }

  async removeLink(id) {
    this.trip.inbox = this.trip.inbox.filter((x) => x.id !== id);
    await this._commit();
  }

  /* превратить ссылку из инбокса в место выбранного дня (в конец) */
  async placeFromLink(linkId, dayNumber) {
    const link = this.trip.inbox.find((l) => l.id === linkId);
    if (!link) return;
    const place = createPlace({
      id: uid("place"),
      name: link.parsedName || "Из ссылки",
      coords: link.parsedCoords || null,
      photo: link.parsedPhoto || "🔗",
      dayNumber,
      order: maxOrderInDay(this.trip, dayNumber) + 1,
      source: "link",
      sourceUrl: link.url,
    });
    this.trip.places.push(place);
    this.trip.inbox = this.trip.inbox.filter((l) => l.id !== linkId);
    await this._commit();
    return place;
  }
}
