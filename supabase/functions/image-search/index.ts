// ============================================================
// EDGE-ФУНКЦИЯ: image-search — батч-поиск картинок по названиям мест
//
// Вход:  { queries: string[] }   (напр. "London Bagel Museum Anguk Сеул")
// Выход: { images: (string|null)[] }  — миниатюра (URL) в том же порядке, что queries.
//
// Источник: Kakao (Daum) image search — тот же dapi.kakao.com и тот же
// KAKAO_REST_KEY, что у geocode. Берём thumbnail_url: он лежит на CDN Kakao
// (search*.kakaocdn.net) и хотлинкается без проблем с referrer.
//
// Деплой: supabase functions deploy image-search --no-verify-jwt
// Секрет: KAKAO_REST_KEY (REST API key из Kakao Developers, продукт «Search»).
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const KAKAO_KEY = Deno.env.get("KAKAO_REST_KEY") ?? "";
const MAX = 60;
const THROTTLE_MS = 120;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const queries: string[] = Array.isArray(body.queries) ? body.queries.map((q: unknown) => String(q ?? "")) : [];
    const images: (string | null)[] = [];
    for (const q of queries.slice(0, MAX)) {
      images.push(q.trim() ? await searchImage(q.trim()) : null);
      await sleep(THROTTLE_MS);
    }
    return json({ images });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// Kakao image search: documents[].thumbnail_url / .image_url. Берём миниатюру
// (на CDN Kakao — надёжно грузится). recency-сорт по умолчанию; size=1.
async function searchImage(q: string): Promise<string | null> {
  if (!KAKAO_KEY) return null;
  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/search/image?size=1&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
    );
    if (!r.ok) return null;
    const d = await r.json();
    const doc = Array.isArray(d?.documents) ? d.documents[0] : null;
    const url = doc?.thumbnail_url || doc?.image_url;
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
