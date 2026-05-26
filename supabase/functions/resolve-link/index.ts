// ============================================================
// EDGE-ФУНКЦИЯ: resolve-link
// Принимает { url } → разворачивает короткие ссылки (goo.gl и т.п.),
// читает страницу (на сервере нет CORS), достаёт название места,
// при наличии ключа уточняет его через Claude, геокодит координаты.
// Возвращает { name, coords, displayName, sourceUrl }.
//
// Деплой: supabase functions deploy resolve-link --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (необязательно — без него работает базовый разбор)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Самая дешёвая Claude — текста на разбор мало (заголовок + фрагмент), хватает.
// ИИ включается, только если задан ANTHROPIC_API_KEY; иначе работает бесплатный путь.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { url } = await req.json();
    if (!url) return json({ error: "no url" }, 400);

    // 1. развернуть редиректы (короткие ссылки) — fetch следует за ними
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "seoul-trip/1.0" } });
    const finalUrl = res.url || url;
    const html = await res.text();

    // 2. ТОЧНЫЙ маркер места из URL (центр карты сюда НЕ берём — он врёт:
    //    у Яндекса `ll` это центр вьюпорта, иногда за километры от места).
    let coords = exactCoordsFor(finalUrl) ?? exactCoordsFor(url);
    let name = nameFromUrl(finalUrl) ?? "";

    // 3. имя из страницы (og:title / <title>), если из URL не вышло
    if (!name) name = titleFromHtml(html);

    // 4. фото и описание из og-тегов страницы (у Instagram/блогов — настоящие;
    //    у Google og:image — превью-карта, og:description — мусор, чистим).
    const image = imageFromHtml(html);
    let description = cleanDesc(descFromHtml(html));

    // 5. через Claude (Haiku, если есть ключ): чистое имя, описание и гео-запрос
    //    для геокодера (английское/локальное имя + город, без слов «дворец/кафе»).
    let geo = "";
    if (ANTHROPIC_KEY && (html || name)) {
      const d = await describePlace(name, html);
      if (d.name) name = d.name;
      if (d.description) description = d.description;
      geo = d.geo;
    }

    // 6. нет точного маркера → геокодим по чистому имени (надёжнее центра карты)
    let displayName = "";
    if (!coords) {
      const g = await geocode(geo || name);
      if (g) { coords = g.coords; displayName = g.displayName; }
    }

    // 7. последний резерв — центр карты из URL (приблизительно)
    if (!coords) coords = centerCoordsFor(finalUrl) ?? centerCoordsFor(url);

    return json({ name: name || "", coords: coords ?? null, image, description, displayName, sourceUrl: finalUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ТОЧНЫЙ маркер места из URL (НЕ центр карты). Яндекс отдаёт `долгота,широта`
// — переставляем в [широта, долгота]; Google/Kakao уже дают `широта,долгота`.
function exactCoordsFor(u: string): [number, number] | null {
  if (/yandex/i.test(u)) {
    const m = u.match(/whatshere\[point\]=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
    return m ? [+m[2], +m[1]] : null; // только точка «что здесь», не центр
  }
  let m = u.match(/link\/map\/[^,]+,(-?\d+\.\d+),(-?\d+\.\d+)/); // Kakao
  if (m) return [+m[1], +m[2]];
  m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)               // Google маркер
    || u.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);          // ?q=lat,lng (точка)
  return m ? [+m[1], +m[2]] : null;
}

// Центр карты/вьюпорта из URL — приблизительно, только как последний резерв.
function centerCoordsFor(u: string): [number, number] | null {
  if (/yandex/i.test(u)) {
    const m = u.match(/[?&](?:ll|pt)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
    return m ? [+m[2], +m[1]] : null;
  }
  const m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    || u.match(/[?&](?:ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return m ? [+m[1], +m[2]] : null;
}

function nameFromUrl(u: string): string {
  const m = u.match(/\/place\/([^/@]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
}

function titleFromHtml(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).trim();
  const t = html.match(/<title>([^<]+)<\/title>/i);
  return t ? decodeEntities(t[1]).trim() : "";
}

// og:image / twitter:image — фото (у Instagram/блогов настоящее, у Google превью-карта).
function imageFromHtml(html: string): string {
  const m = metaContent(html, "og:image") || metaContent(html, "twitter:image");
  return m ? decodeEntities(m).trim() : "";
}

// og:description / meta description — краткое описание со страницы.
function descFromHtml(html: string): string {
  const m = metaContent(html, "og:description")
    || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1];
  return m ? decodeEntities(m).trim() : "";
}

// Содержимое meta-тега по property (og:*) или name — порядок атрибутов любой.
function metaContent(html: string, key: string): string {
  const k = key.replace(/[:]/g, "\\:");
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${k}["']`, "i"))?.[1]
    || ""
  );
}

// Отсеять мусорные дефолтные описания Google Maps (страница — SPA-заглушка).
function cleanDesc(s: string): string {
  const junk = /find local businesses|view maps|get driving directions|найти информацию о местных|посмотреть карты/i;
  return s && junk.test(s) ? "" : s;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function geocode(q: string) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "seoul-trip/1.0" } });
    const d = await r.json();
    if (Array.isArray(d) && d.length) return { coords: [+d[0].lat, +d[0].lon] as [number, number], displayName: d[0].display_name };
  } catch { /* ignore */ }
  return null;
}

// Claude (Haiku): по названию + фрагменту страницы вернуть чистое имя места,
// краткое описание и гео-запрос для геокодера. Одним вызовом, ответ — JSON.
async function describePlace(title: string, html: string): Promise<{ name: string; description: string; geo: string }> {
  const empty = { name: "", description: "", geo: "" };
  try {
    const text = (title + "\n" + html.replace(/<[^>]+>/g, " ")).slice(0, 4000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 260,
        messages: [{
          role: "user",
          content: `Это место для путешествия (заголовок + текст страницы). Верни ТОЛЬКО JSON без пояснений: {"name": "короткое название места и город по-русски", "description": "1–2 предложения по-русски: что это за место и чем интересно туристу", "geo": "запрос для геокодера: официальное название на английском или местном языке + город, БЕЗ слов вроде «дворец/кафе/ресторан» (напр. Gyeongbokgung, Seoul)"}. Если узнаёшь конкретное место по названию — опиши из своих знаний. Если место не определяется — верни всё пустыми строками.\n\n${text}`,
        }],
      }),
    });
    const d = await r.json();
    const raw = (d?.content?.[0]?.text ?? "").trim();
    const j = raw.match(/\{[\s\S]*\}/);
    if (!j) return empty;
    const parsed = JSON.parse(j[0]);
    return {
      name: typeof parsed.name === "string" ? parsed.name.trim().slice(0, 120) : "",
      description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 400) : "",
      geo: typeof parsed.geo === "string" ? parsed.geo.trim().slice(0, 160) : "",
    };
  } catch {
    return empty;
  }
}
