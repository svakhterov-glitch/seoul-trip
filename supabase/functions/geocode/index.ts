// ============================================================
// EDGE-ФУНКЦИЯ: geocode — батч-геокодинг списка запросов
//
// Вход:  { queries: string[] }   (английские/латинизированные запросы, напр.
//        "Gyeongbokgung Palace, Seoul, South Korea")
// Выход: { coords: ([lat,lng]|null)[] }  — в том же порядке, что queries.
//
// Зачем отдельная функция: Nominatim не отдаёт CORS (из браузера нельзя), а
// делать геокодинг внутри generate-itinerary — не уложиться в лимит времени
// (модель + ~1 запрос/сек × 20 мест). Здесь только геокодинг → быстро.
//
// Деплой: supabase functions deploy geocode --no-verify-jwt
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const MAX = 40;            // потолок числа запросов за вызов (× ~1.1с ≈ 44с < лимита)
const THROTTLE_MS = 1100;  // лимит Nominatim — ~1 запрос/сек

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const queries: string[] = Array.isArray(body.queries) ? body.queries.map((q: unknown) => String(q ?? "")) : [];
    const coords: ([number, number] | null)[] = [];
    for (const q of queries.slice(0, MAX)) {
      coords.push(q.trim() ? await geocode(q.trim()) : null);
      await sleep(THROTTLE_MS);
    }
    return json({ coords });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function geocode(q: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tripsplan/1.0 (itinerary geocoder)" } },
    );
    const d = await r.json();
    if (Array.isArray(d) && d.length) return [+d[0].lat, +d[0].lon];
  } catch { /* ignore */ }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
