import type { Coords } from '@/lib/entities';

/** Результат фронтового разбора вставленной ссылки (без сети). */
export interface ParsedLink {
  name: string;
  coords: Coords | null;
  source: string; // 'google' | 'kakao' | 'instagram' | 'other'
}

/** Координаты из текста URL карт (Google/Kakao). */
function coordsFromUrl(u: string): Coords | null {
  let m = u.match(/link\/map\/[^,]+,(-?\d+\.\d+),(-?\d+\.\d+)/); // Kakao
  if (m) return [+m[1], +m[2]];
  m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)           // Google маркер (точнее центра)
    || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)              // Google @lat,lng (центр карты)
    || u.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); // ?q=lat,lng
  return m ? [+m[1], +m[2]] : null;
}

/** Координаты из URL Яндекс.Карт. Берём ТОЛЬКО точку «что здесь»
 *  (`whatshere[point]`) — это реальный маркер. `ll`/`pt` это центр карты,
 *  он часто за километры от места, поэтому на фронте его не берём: пусть
 *  ссылка останется без координат и сервер доразберёт по имени (геокодинг).
 *  Яндекс отдаёт `долгота,широта` — переставляем в [широта, долгота]. */
function coordsFromYandex(u: string): Coords | null {
  const m = u.match(/whatshere\[point\]=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  return m ? [+m[2], +m[1]] : null;
}

/** Название места из пути Google `/place/<Имя>`. */
function nameFromUrl(u: string): string {
  const m = u.match(/\/place\/([^/@?]+)/);
  if (!m) return '';
  const raw = m[1].replace(/\+/g, ' ');
  try { return decodeURIComponent(raw).trim(); } catch { return raw.trim(); }
}

/**
 * Похож ли ввод на ссылку, а не на поисковый запрос по названию? Ссылка —
 * это `http(s)://…` или голый домен без пробелов (`kko.to/…`, `maps.app.goo.gl/…`).
 * Текст с пробелами или без точки-домена (`Кёнбоккун`, `Cafe Onion`) — это запрос.
 */
export function isLink(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/\s/.test(t)) return false; // в названиях мест бывают пробелы — это запрос
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|\?|$)/i.test(t); // голый домен: foo.com, foo.com/bar
}

/** Тип ссылки по домену — для иконки/чипа. */
function sourceFromUrl(u: string): string {
  const s = u.toLowerCase();
  if (s.includes('yandex') || s.includes('yandex.')) return 'yandex';
  if (s.includes('kakao') || s.includes('kko.to')) return 'kakao';
  if (s.includes('instagr')) return 'instagram';
  if (s.includes('google') || s.includes('goo.gl') || s.includes('maps.app')) return 'google';
  return 'other';
}

/**
 * Разобрать вставленную ссылку на месте — чисто на фронте, без запросов
 * (браузер не может читать чужие страницы из-за CORS). Координаты и имя берём
 * из самого URL карт; для Instagram/блога вернётся пустое имя без координат.
 * Это фолбэк-шов: позже async-сервис resolveLink дополнит через бэкенд.
 */
export function parseLink(url: string): ParsedLink {
  const u = (url || '').trim();
  const source = sourceFromUrl(u);
  const coords = source === 'yandex' ? coordsFromYandex(u) : coordsFromUrl(u);
  return { name: nameFromUrl(u), coords, source };
}
