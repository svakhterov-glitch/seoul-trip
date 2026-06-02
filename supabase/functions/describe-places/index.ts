// ============================================================
// EDGE-ФУНКЦИЯ: describe-places
// Вход: { names: string[], city, country }
// Для каждого места — ОДНА короткая фраза по-русски (что это/чем интересно).
// Haiku БЕЗ веб-поиска — быстро/дёшево/без лимитов. Незнакомое место → ''.
// Выход: { descriptions: string[] } (в том же порядке и длине, что names).
//
// Деплой: supabase functions deploy describe-places --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const names: string[] = Array.isArray(body.names) ? body.names.map(String).slice(0, MAX) : [];
    if (names.length === 0) return json({ descriptions: [] });
    if (!ANTHROPIC_KEY) return json({ descriptions: names.map(() => "") });

    const where = [String(body.city ?? ""), String(body.country ?? "")].filter(Boolean).join(", ");
    const listText = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
    const prompt = `Ты — тревел-редактор. Город: ${where || "не указан"}.
Для КАЖДОГО места из списка напиши ОДНУ короткую фразу по-русски: что это за место и
чем оно интересно (до 90 символов, без кавычек и эмодзи). Если место незнакомо —
пустая строка "".
Верни ТОЛЬКО JSON-массив строк в ТОМ ЖЕ порядке и той же длины (${names.length}),
без пояснений и markdown. Первый символ ответа — «[», последний — «]».
Места:
${listText}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json();
    if (d?.error) return json({ descriptions: names.map(() => "") });
    const text = (Array.isArray(d?.content) ? d.content : [])
      .filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
    const m = text.match(/\[[\s\S]*\]/);
    let arr: unknown[] = [];
    if (m) { try { const p = JSON.parse(m[0]); if (Array.isArray(p)) arr = p; } catch { /* ignore */ } }
    const descriptions = names.map((_, i) => (typeof arr[i] === "string" ? (arr[i] as string) : "").trim().slice(0, 120));
    return json({ descriptions });
  } catch (e) {
    return json({ descriptions: [], error: String(e) }, 200);
  }
});
