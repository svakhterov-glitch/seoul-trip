import { getSupabase } from '@/lib/supabase/client';
import type { MediaItem, MediaRubric } from '@/lib/media';
import { demoMediaFor } from '@/lib/mediaDemo';
import { geocodeQueries } from '@/lib/geocode';

const RUBRICS: MediaRubric[] = ['new', 'best', 'trending'];

let counter = 0;
function newId(): string {
  counter += 1;
  return `media_${Date.now().toString(36)}_${counter}`;
}

/** Сырое место из trends + его geo-запрос (geo нужен только для геокодинга). */
function rawToItem(raw: unknown): { item: MediaItem; geo: string } | null {
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return null;
  const rubric = (typeof r.rubric === 'string' && RUBRICS.includes(r.rubric as MediaRubric))
    ? (r.rubric as MediaRubric) : 'trending';
  return {
    geo: typeof r.geo === 'string' ? r.geo : '',
    item: {
      id: typeof r.id === 'string' && r.id ? r.id : newId(),
      name,
      coords: null, // проставим геокодингом ниже
      segment: typeof r.segment === 'string' && r.segment ? r.segment : 'other',
      rubric,
      blurb: typeof r.blurb === 'string' ? r.blurb : '',
      image: typeof r.image === 'string' ? r.image : '',
      source: typeof r.source === 'string' ? r.source : '',
      sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : '',
      sourceDate: typeof r.sourceDate === 'string' ? r.sourceDate : '',
    },
  };
}

/**
 * Живой поиск трендовых мест (edge-функция `trends`: ИИ + web_search) с
 * клиентским геокодингом. `exclude` — имена уже показанных мест (чтобы «обновить»
 * приносило новые). Любая ошибка → пустой список.
 */
async function fetchLiveTrends(city: string, country: string, exclude: string[]): Promise<MediaItem[]> {
  try {
    const { data, error } = await getSupabase().functions.invoke('trends', {
      body: { city, country, exclude },
    });
    if (error || !data || (data as { error?: string }).error) return [];
    const list = (data as { items?: unknown }).items;
    if (!Array.isArray(list)) return [];
    const seen = new Set(exclude.map((s) => s.toLowerCase().trim()));
    const parsed = list
      .map(rawToItem)
      .filter((x): x is { item: MediaItem; geo: string } => x !== null)
      .filter((x) => !seen.has(x.item.name.toLowerCase()));
    const coords = await geocodeQueries(parsed.map((x) => x.geo || x.item.name));
    return parsed.map((x, i) => ({ ...x.item, coords: coords[i] ?? null }));
  } catch {
    return [];
  }
}

/**
 * Доска «Медиа» города. Для городов из демо-набора — готовая фикстура реальных
 * мест с координатами и живыми ссылками (см. lib/mediaDemo.ts). Иначе — живой
 * поиск через `trends`. Места без координат остаются в витрине, но не на карте.
 */
export async function fetchMediaBoard(city: string, country = ''): Promise<MediaItem[]> {
  const c = (city || '').trim();
  if (!c) return [];
  const demo = demoMediaFor(c);
  if (demo) return demo;
  return fetchLiveTrends(c, (country || '').trim(), []);
}

/**
 * «Обновить / искать новые»: всегда живой поиск через `trends`, исключая уже
 * показанные места (по имени). Возвращает только НОВЫЕ найденные места.
 */
export async function fetchMoreMedia(city: string, country: string, existing: MediaItem[]): Promise<MediaItem[]> {
  const c = (city || '').trim();
  if (!c) return [];
  const exclude = existing.map((m) => m.name).filter(Boolean);
  return fetchLiveTrends(c, (country || '').trim(), exclude);
}
