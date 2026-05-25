/* ============================================================
   ЛЁГКИЙ ПАРСЕР ССЫЛОК (фронтенд, без сети)
   Достаёт из URL что можно без запроса: координаты (Google/Kakao
   Maps), название и иконку по источнику. Чего не хватает —
   пользователь дополнит вручную при «разборе».
   Серьёзный парсинг (заголовок/фото из Instagram/блогов) — позже
   серверной функцией.
   ============================================================ */

export function parseLink(url) {
  let name = "", coords = null, photo = "🔗";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // Kakao: /link/map/<name>,<lat>,<lng>
    let m = url.match(/link\/map\/([^,]+),(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) { name = safeDecode(m[1]); coords = [+m[2], +m[3]]; }

    // Google Maps: @lat,lng  |  !3dlat!4dlng  |  q=/ll=/query=lat,lng
    if (!coords) { m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if (m) coords = [+m[1], +m[2]]; }
    if (!coords) { m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); if (m) coords = [+m[1], +m[2]]; }
    if (!coords) { m = url.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); if (m) coords = [+m[1], +m[2]]; }

    // Google Maps: /place/<Name>/
    if (!name) { m = url.match(/\/place\/([^/@]+)/); if (m) name = safeDecode(m[1].replace(/\+/g, " ")); }

    // иконка по источнику
    if (host.includes("instagram")) photo = "📸";
    else if (host.includes("kakao")) photo = "🗺️";
    else if (host.includes("google")) photo = "📍";
    else if (host.includes("youtu")) photo = "▶️";
    else if (host.includes("t.me") || host.includes("telegram")) photo = "✈️";

    if (!name) name = host || url.slice(0, 40);
  } catch {
    name = url.slice(0, 40) || "Ссылка";
  }
  return { name, coords, photo };
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
