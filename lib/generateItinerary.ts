import { getSupabase } from '@/lib/supabase/client';
import type { ItineraryDraft, ItineraryDraftPlace, PlacePrice } from '@/lib/entities';
import { toCoords, geocodeQueries } from '@/lib/geocode';

/** Темп дня, который пользователь задаёт перед сборкой. */
export type ItineraryPace = 'relaxed' | 'moderate' | 'packed';

export interface GenerateItineraryInput {
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  days: number;          // число дней в каркасе (для раскладки)
  pace: ItineraryPace;
  interests: string[];   // ключи PLACE_KINDS или свободные слова
  restFirstDay: boolean; // первый день — спокойный (отдых)
  arrival?: string;      // 'YYYY-MM-DD HH:MM' прилёта ('' если не задано)
  departure?: string;    // 'YYYY-MM-DD HH:MM' вылета ('' если не задано)
}

function toPrice(v: unknown): PlacePrice {
  if (v === 'free' || v === 1 || v === 2 || v === 3) return v;
  if (typeof v === 'number') { const n = Math.round(v); return (n >= 1 && n <= 3 ? (n as PlacePrice) : null); }
  return null;
}

/**
 * Очистить текст от модели: модель иногда вставляет HTML-теги (<br>) и числовые
 * сущности (&#233; → é) прямо в названия/описания — здесь их убираем/декодируем.
 */
export function cleanItineraryText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<[^>]+>/g, ' ')                                            // теги (<br> и пр.)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Внутренний кандидат: место из generate + его geo-запрос для геокодера. */
interface DraftCandidate extends ItineraryDraftPlace {
  geo: string;
}

function normalizePlace(raw: unknown): DraftCandidate | null {
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  const day = typeof r.dayNumber === 'number' ? Math.round(r.dayNumber)
    : (typeof r.dayNumber === 'string' ? Math.round(Number(r.dayNumber)) : 0);
  if (!name || !Number.isFinite(day) || day < 1) return null;
  return {
    dayNumber: day,
    time: typeof r.time === 'string' ? r.time.trim() : '',
    name: cleanItineraryText(name),
    coords: toCoords(r.coords),
    desc: cleanItineraryText(r.desc),
    price: toPrice(r.price),
    kind: typeof r.kind === 'string' ? r.kind : '',
    by: cleanItineraryText(typeof r.by === 'string' ? r.by : r.source),
    sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : '',
    sourceDate: typeof r.sourceDate === 'string' ? r.sourceDate : '',
    seasonNote: cleanItineraryText(r.seasonNote),
    district: cleanItineraryText(r.district),
    geo: typeof r.geo === 'string' ? r.geo : '',
  };
}


/**
 * Собрать черновик ИИ-маршрута на сервере (edge-функция `generate-itinerary`):
 * живой поиск по медиа и тревел-блогерам под город и ДАТЫ поездки, проверка на
 * актуальность и сезон, кластеризация по районам и раскладка по дням под темп.
 * Браузеру это не по силам (CORS, ключи, веб-поиск), поэтому работа уходит на
 * сервер. Любая ошибка → `null` (поездка не меняется, как у resolveLink).
 */
export async function generateItinerary(input: GenerateItineraryInput): Promise<ItineraryDraft | null> {
  const city = (input.city || '').trim();
  if (!city) return null;
  try {
    const { data, error } = await getSupabase().functions.invoke('generate-itinerary', {
      body: {
        city,
        country: input.country || '',
        startDate: input.startDate,
        endDate: input.endDate,
        days: input.days,
        pace: input.pace,
        interests: input.interests,
        restFirstDay: input.restFirstDay,
        arrival: input.arrival || '',
        departure: input.departure || '',
      },
    });
    if (error || !data || (data as { error?: string }).error) return null;
    const list = (data as { places?: unknown }).places;
    if (!Array.isArray(list)) return null;
    const candidates = list.map(normalizePlace).filter((p): p is DraftCandidate => p !== null);
    if (candidates.length === 0) return null;

    // Геокодинг по английскому запросу `geo` (резерв — само имя). Отдельной
    // функцией, чтобы не упереться в лимит времени generate-itinerary.
    const coords = await geocodeQueries(candidates.map((c) => c.geo || c.name));
    const places: ItineraryDraftPlace[] = candidates.map((c, i) => {
      const { geo: _geo, ...rest } = c;
      return { ...rest, coords: c.coords ?? coords[i] ?? null };
    });
    return { places };
  } catch {
    return null;
  }
}
