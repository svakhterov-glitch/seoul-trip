/* ============================================================
   ИИ-СЕРВИС ЧЕРЕЗ EDGE-ФУНКЦИЮ (настоящий Claude)
   Тот же контракт, что у MockAiService — UI не меняется. Вызывает
   функцию generate-itinerary (см. backend/functions). Возвращает
   места в формате модели (createPlace, source 'ai').
   ============================================================ */

import { AiService } from "./aiService.js";
import { createPlace } from "../model/entities.js";

export class ApiAiService extends AiService {
  constructor(functionsUrl) {
    super();
    this.url = `${functionsUrl}/generate-itinerary`;
  }

  async generateItinerary(trip, prefs = {}) {
    const r = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: trip.city,
        days: trip.days.length,
        interests: trip.interests || [],
        pace: trip.pace || prefs.pace || "moderate",
      }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.places || []).map((p) => createPlace({ ...p, id: undefined, order: null, source: "ai" }));
  }
}
