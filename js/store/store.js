/* ============================================================
   STORE · состояние приложения
   Держит текущую поездку и UI-состояние (активный день) в памяти,
   уведомляет подписчиков об изменениях и сохраняет данные через
   Repository. UI читает состояние отсюда и вызывает действия —
   но никогда не трогает хранилище напрямую.
   ============================================================ */

import { uid, createPlace, createInboxLink } from "../model/entities.js";

export class Store {
  /** @param {Repository} repo @param {Trip} trip */
  constructor(repo, trip) {
    this.repo = repo;
    this.trip = trip;
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
    this.trip = trip;
    this.activeDay = 0;
    this._emit();
  }

  /* ---------- UI-действия ---------- */
  setActiveDay(day) {
    this.activeDay = day;
    this._emit(); // смена дня не пишется в хранилище
  }

  /* ---------- мутации данных (для Этапов 2–4) ---------- */

  async addPlace(data) {
    const place = createPlace({ ...data, id: uid("place") });
    this.trip.places.push(place);
    await this._commit();
    return place;
  }

  async updatePlace(id, patch) {
    const p = this.trip.places.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    await this._commit();
  }

  async removePlace(id) {
    this.trip.places = this.trip.places.filter((x) => x.id !== id);
    await this._commit();
  }

  /* перенос места в другой день (drag-and-drop) */
  async movePlaceToDay(id, dayNumber, time) {
    const p = this.trip.places.find((x) => x.id === id);
    if (p) {
      p.dayNumber = dayNumber;
      if (time != null) p.time = time;
    }
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
}
