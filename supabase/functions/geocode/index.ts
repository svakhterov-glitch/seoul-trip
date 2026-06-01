// ============================================================
// EDGE-ФУНКЦИЯ: geocode — батч-геокодинг списка запросов
//
// Вход:  { queries: string[] }   (напр. "Gyeongbokgung Palace, Seoul, South Korea")
// Выход: { coords: ([lat,lng]|null)[] }  — в том же порядке, что queries.
//
// Геокодер: Kakao Local (keyword search) — лучший по корейским местам/отелям.
// Если KAKAO_REST_KEY не задан — фолбэк на Nominatim (OSM). Отдельная функция,
// т.к. из браузера эти API не зовутся (CORS/ключ), а внутри generate-itinerary
// геокодинг не укладывался в лимит времени.
//
// Деплой: supabase functions deploy geocode --no-verify-jwt
// Секрет: KAKAO_REST_KEY (REST API key из Kakao Developers) — желателен.
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const KAKAO_KEY = Deno.env.get("KAKAO_REST_KEY") ?? "";
const MAX = 40;
// Kakao держит высокий QPS — троттлим слабо; для Nominatim (фолбэк) нужен ~1/сек.
const THROTTLE_MS = KAKAO_KEY ? 120 : 1100;

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
  return (KAKAO_KEY ? await kakao(q) : null) ?? await nominatim(q);
}

// Kakao keyword search: documents[].x = долгота, .y = широта.
async function kakao(q: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?size=1&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
    );
    if (!r.ok) return null;
    const d = await r.json();
    const doc = Array.isArray(d?.documents) ? d.documents[0] : null;
    if (doc && doc.y && doc.x) return [parseFloat(doc.y), parseFloat(doc.x)];
  } catch { /* ignore */ }
  return null;
}

async function nominatim(q: string): Promise<[number, number] | null> {
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
