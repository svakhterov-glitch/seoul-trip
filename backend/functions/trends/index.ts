// ============================================================
// EDGE-ФУНКЦИЯ: trends
// Принимает { city } → возвращает { trends: [...] } трендовых мест.
// Если задан KAKAO_REST_KEY и город в Корее — ищет популярные места
// через Kakao Local API; иначе отдаёт курируемый запасной список
// (тот же, что на фронте). Формат карточек одинаковый.
//
// Деплой: supabase functions deploy trends --no-verify-jwt
// Секреты: KAKAO_REST_KEY (необязательно)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const KAKAO_KEY = Deno.env.get("KAKAO_REST_KEY") ?? "";

// трендовые поисковые запросы для Кореи (что сейчас «на слуху»)
const KOREA_QUERIES = ["핫플 카페", "팝업스토어", "전시", "루프탑 바", "베이커리"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { city = "" } = await req.json();
    const isKorea = /korea|коре|seoul|сеул|서울/i.test(city);

    if (KAKAO_KEY && isKorea) {
      const trends = await kakaoTrends(city);
      if (trends.length) return json({ trends, source: "kakao" });
    }
    return json({ trends: [], source: "fallback" }); // фронт покажет свою подборку
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function kakaoTrends(city: string) {
  const out: any[] = [];
  for (const q of KOREA_QUERIES) {
    try {
      const r = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?size=2&query=${encodeURIComponent(`${city} ${q}`)}`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
      );
      const d = await r.json();
      for (const doc of d?.documents ?? []) {
        out.push({
          name: doc.place_name,
          area: doc.road_address_name || doc.address_name || "",
          coords: [+doc.y, +doc.x],
          photo: "🔥",
          why: `Популярно по запросу «${q}» в Kakao Map.`,
        });
      }
    } catch { /* ignore one query */ }
  }
  return out;
}
