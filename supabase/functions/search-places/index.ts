// ============================================================
// EDGE-ФУНКЦИЯ: search-places
// Принимает { query, city, country } → места по названию в пределах города.
// Геокодер/поиск: Kakao Local (keyword search) — лучший по корейским местам.
// Порядок: 1) Kakao keyword search по запросу; 2) если пусто и есть
// ANTHROPIC_API_KEY — Haiku предлагает кандидатов, геокодим (Kakao/Nominatim);
// 3) фолбэк — прямой Nominatim. Возвращает
// { candidates: [{ name, address, desc, coords:[lat,lng] }] }.
//
// Деплой: supabase functions deploy search-places --no-verify-jwt
// Секреты: KAKAO_REST_KEY (желателен), ANTHROPIC_API_KEY (необязателен)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const KAKAO_KEY = Deno.env.get("KAKAO_REST_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX = 5;

interface Candidate { name: string; address: string; desc: string; coords: [number, number]; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { query, city, country } = await req.json();
    const q = (query ?? "").toString().trim();
    if (!q) return json({ error: "no query" }, 400);
    const where = [city, country].filter(Boolean).join(", ");

    // 1. Kakao keyword search — прямо по запросу (отлично для корейских мест/отелей).
    let candidates: Candidate[] = KAKAO_KEY ? await kakaoSearch(q) : [];

    // 2. Если пусто и есть ИИ — Haiku понимает фаззи/русские запросы и опечатки.
    if (candidates.length === 0 && ANTHROPIC_KEY) {
      const ideas = await suggestPlaces(q, city ?? "", country ?? "");
      candidates = await geocodeIdeas(ideas, where);
    }

    // 3. Фолбэк — прямой Nominatim.
    if (candidates.length === 0) {
      candidates = await nominatimSearch(`${q}, ${where}`);
    }

    return json({ candidates: dedupe(candidates).slice(0, MAX) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ---- Kakao Local ----------------------------------------------------------

async function kakaoSearch(q: string): Promise<Candidate[]> {
  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?size=${MAX}&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
    );
    if (!r.ok) return [];
    const d = await r.json();
    const docs = Array.isArray(d?.documents) ? d.documents : [];
    return docs.map((doc: Record<string, any>): Candidate => ({
      name: String(doc.place_name ?? "").trim(),
      address: String(doc.road_address_name || doc.address_name || "").trim(),
      desc: String(doc.category_name ?? "").split(">").pop()?.trim() ?? "",
      coords: [parseFloat(doc.y), parseFloat(doc.x)],
    })).filter((c: Candidate) => c.name && Number.isFinite(c.coords[0]) && Number.isFinite(c.coords[1]));
  } catch {
    return [];
  }
}

// ---- ИИ: список кандидатов по запросу (фаззи/русские запросы) --------------

interface Idea { name: string; desc: string; geo: string; }

async function suggestPlaces(query: string, city: string, country: string): Promise<Idea[]> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{
          role: "user",
          content:
            `Пользователь ищет место для путешествия в городе ${city || "?"}${country ? ", " + country : ""}. ` +
            `Запрос: «${query}». Верни ТОЛЬКО JSON-массив до ${MAX} наиболее подходящих РЕАЛЬНЫХ мест ` +
            `(если запрос — конкретное место, верни его одно; если общий, напр. «кафе в Хондэ» — несколько вариантов). ` +
            `Каждый элемент: {"name": "короткое название места по-русски", ` +
            `"desc": "1 предложение по-русски: чем интересно", ` +
            `"geo": "запрос для геокодера: официальное название на английском или местном языке + город, БЕЗ слов вроде «кафе/дворец»"}. ` +
            `Только места в пределах города ${city || ""}. Если ничего не подходит — верни [].`,
        }],
      }),
    });
    const d = await r.json();
    const raw = (d?.content?.[0]?.text ?? "").trim();
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: Record<string, unknown>): Idea => ({
        name: typeof x.name === "string" ? x.name.trim().slice(0, 120) : "",
        desc: typeof x.desc === "string" ? x.desc.trim().slice(0, 400) : "",
        geo: typeof x.geo === "string" ? x.geo.trim().slice(0, 160) : "",
      }))
      .filter((i: Idea) => i.name && i.geo)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

async function geocodeIdeas(ideas: Idea[], where: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const idea of ideas) {
    const g = await geocode(idea.geo) ?? await geocode(`${idea.name}, ${where}`);
    if (g) out.push({ name: idea.name, address: g.address, desc: idea.desc, coords: g.coords });
    await sleep(KAKAO_KEY ? 120 : 300);
  }
  return out;
}

// ---- Геокодер: Kakao → Nominatim -------------------------------------------

async function geocode(q: string): Promise<{ coords: [number, number]; address: string } | null> {
  if (KAKAO_KEY) {
    const k = await kakaoSearch(q);
    if (k.length) return { coords: k[0].coords, address: k[0].address };
  }
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tripsplan/1.0 (tripsplan.ru)" } },
    );
    const d = await r.json();
    if (Array.isArray(d) && d.length) {
      return { coords: [+d[0].lat, +d[0].lon], address: d[0].display_name ?? "" };
    }
  } catch { /* ignore */ }
  return null;
}

async function nominatimSearch(q: string): Promise<Candidate[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=${MAX}&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tripsplan/1.0 (tripsplan.ru)" } },
    );
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map((row: Record<string, any>): Candidate => {
      const display = (row.display_name as string) ?? "";
      const name = (row.namedetails?.name as string) || display.split(",")[0] || "";
      return { name: name.trim(), address: display, desc: "", coords: [+row.lat, +row.lon] };
    }).filter((c: Candidate) => c.name);
  } catch {
    return [];
  }
}

function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of list) {
    const key = `${c.coords[0].toFixed(4)},${c.coords[1].toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
