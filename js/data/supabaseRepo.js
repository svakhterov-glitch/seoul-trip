/* ============================================================
   РЕАЛИЗАЦИЯ ХРАНИЛИЩА НА SUPABASE (через REST)
   Тот же контракт, что у LocalStorageRepository — приложение не
   замечает разницы. Данные поездки лежат как JSONB в таблице trips
   (см. backend/schema.sql). Зависимостей нет: ходим в Supabase REST
   обычным fetch.

   Авторизация: для RLS нужен JWT пользователя (cfg.accessToken).
   Без входа запросы пойдут с anon-ключом и будут отclonкнены RLS —
   поэтому к боевому использованию нужен экран входа (Supabase Auth),
   см. backend/README.md. Это каркас, готовый к подключению.
   ============================================================ */

import { Repository } from "./repository.js";
import { createTrip } from "../model/entities.js";

export class SupabaseRepository extends Repository {
  /** @param {{url, anonKey, getToken?:()=>Promise<string>}} cfg */
  constructor(cfg) {
    super();
    this.cfg = cfg;
    this.base = `${cfg.url}/rest/v1/trips`;
  }

  // заголовки с актуальным токеном пользователя (или anon как запасной)
  async _headers(extra = {}) {
    const token = (this.cfg.getToken ? await this.cfg.getToken() : null) || this.cfg.anonKey;
    return {
      apikey: this.cfg.anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async listTrips() {
    const r = await fetch(`${this.base}?select=data&order=updated_at.desc`, { headers: await this._headers() });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map((row) => createTrip(row.data));
  }

  async getTrip(id) {
    const r = await fetch(`${this.base}?id=eq.${encodeURIComponent(id)}&select=data`, { headers: await this._headers() });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows.length ? createTrip(rows[0].data) : null;
  }

  async saveTrip(trip) {
    // upsert: один атомарный запрос (Prefer: resolution=merge-duplicates)
    await fetch(this.base, {
      method: "POST",
      headers: await this._headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: trip.id, data: trip }),
    });
    return createTrip(trip);
  }

  async deleteTrip(id) {
    await fetch(`${this.base}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: await this._headers() });
  }
}
