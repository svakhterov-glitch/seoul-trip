// ============================================================
// EDGE-ФУНКЦИЯ: route — пеший маршрут по улицам для перегонов дня
//
// Вход:  { legs: [ [[lat,lng],[lat,lng]], ... ] }   — пары точек (от→до)
// Выход: { geometries: ([[lat,lng],...] | null)[] } — линия по тротуарам на каждый
//        перегон в том же порядке; null, если маршрут не построился.
//
// Роутер: публичный OSRM-инстанс FOSSGIS (routed-foot, профиль «пешком») — без
// ключа, по данным OpenStreetMap. Из браузера не зовём (нет CORS) — поэтому
// серверный fetch здесь. Длинные перегоны (метро) фронт сюда не шлёт.
//
// Деплой: supabase functions deploy route --no-verify-jwt
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const MAX_LEGS = 40;
const THROTTLE_MS = 200; // вежливо к публичному инстансу

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const legs: unknown[] = Array.isArray(body.legs) ? body.legs : [];
    const geometries: ([number, number][] | null)[] = [];
    for (const leg of legs.slice(0, MAX_LEGS)) {
      geometries.push(await route(leg));
      await sleep(THROTTLE_MS);
    }
    return json({ geometries });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function route(leg: unknown): Promise<[number, number][] | null> {
  const pair = Array.isArray(leg) ? leg : [];
  const a = toLngLat(pair[0]);
  const b = toLngLat(pair[1]);
  if (!a || !b) return null;
  try {
    const url = `${OSRM}/${a};${b}?overview=full&geometries=geojson`;
    const r = await fetch(url, { headers: { "User-Agent": "tripsplan/1.0 (+https://tripsplan.ru)" } });
    if (!r.ok) return null;
    const d = await r.json();
    const coords = d?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    // OSRM отдаёт [lng,lat] → переставляем в [lat,lng] (как у Leaflet).
    return coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch {
    return null;
  }
}

// точка [lat,lng] → строка "lng,lat" для OSRM (или null, если точка кривая)
function toLngLat(p: unknown): string | null {
  if (!Array.isArray(p) || p.length !== 2) return null;
  const lat = Number(p[0]);
  const lng = Number(p[1]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  return `${lng},${lat}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
