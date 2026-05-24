/* ============================================================
   ЗАГЛУШКА ИИ-СЕРВИСА (Этап 4)
   Имитирует работу авто-ИИ, возвращая места из базы «опыта»
   (seed Сеула). UI работает с ней так же, как будет работать
   с настоящим серверным ИИ — меняется только эта реализация.
   ============================================================ */

import { AiService } from "./aiService.js";
import { seoulTrip } from "../model/seed.seoul.js";
import { createPlace } from "../model/entities.js";

export class MockAiService extends AiService {
  async generateItinerary(trip, prefs = {}) {
    // имитация сетевой задержки
    await new Promise((r) => setTimeout(r, 400));

    // берём места из базы опыта по нужному городу
    const pool = trip.city === seoulTrip.city ? seoulTrip.places : [];
    const lastDay = trip.days.reduce((m, d) => Math.max(m, d.number), 0);
    return pool
      .filter((p) => p.dayNumber >= 1 && p.dayNumber <= lastDay)
      .map((p) => createPlace({ ...p, id: undefined, order: null, source: "ai" }));
  }
}
