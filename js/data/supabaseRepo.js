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
  constructor(cfg) {
    super();
    this.base = `${cfg.url}/rest/v1/trips`;
    this.headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.accessToken || cfg.anonKey}`,
      "Content-Type": "application/json",
    };
  }

  async listTrips() {
    const r = await fetch(`${this.base}?select=data&order=updated_at.desc`, { headers: this.headers });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map((row) => createTrip(row.data));
  }

  async getTrip(id) {
    const r = await fetch(`${this.base}?id=eq.${encodeURIComponent(id)}&select=data`, { headers: this.headers });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows.length ? createTrip(rows[0].data) : null;
  }

  async saveTrip(trip) {
    // upsert: один атомарный запрос (Prefer: resolution=merge-duplicates)
    await fetch(this.base, {
      method: "POST",
      headers: { ...this.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: trip.id, data: trip }),
    });
    return createTrip(trip);
  }

  async deleteTrip(id) {
    await fetch(`${this.base}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: this.headers });
  }
}
