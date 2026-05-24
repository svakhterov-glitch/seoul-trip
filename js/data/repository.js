/* ============================================================
   ИНТЕРФЕЙС ХРАНИЛИЩА (Repository)
   Контракт доступа к данным. Сегодня его реализует
   LocalStorageRepository (данные в браузере), завтра —
   SupabaseRepository (тот же контракт, данные в облаке).

   Правила, делающие переход на бэкенд безболезненным:
   1. UI и Store работают ТОЛЬКО через этот интерфейс.
   2. Все методы async уже сейчас — сеть не изменит сигнатуры.

   JS не проверяет интерфейсы во время выполнения, поэтому контракт
   задан документацией. Реализации наследуют этот класс.
   ============================================================ */

export class Repository {
  /** @returns {Promise<Trip[]>} список всех поездок */
  async listTrips() { throw new Error("not implemented"); }

  /** @returns {Promise<Trip|null>} поездка по id */
  async getTrip(id) { throw new Error("not implemented"); }

  /** сохранить (создать или обновить) поездку @returns {Promise<Trip>} */
  async saveTrip(trip) { throw new Error("not implemented"); }

  /** удалить поездку @returns {Promise<void>} */
  async deleteTrip(id) { throw new Error("not implemented"); }
}
