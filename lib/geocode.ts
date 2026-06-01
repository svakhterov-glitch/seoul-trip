import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';

/** Привести значение к координатам [lat,lng] или null. */
export function toCoords(v: unknown): Coords | null {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
    ? [v[0], v[1]] as Coords
    : null;
}

/**
 * Геокодинг списка запросов через edge-функцию `geocode` (Nominatim, троттлинг).
 * Возвращает массив координат в том же порядке (null там, где не нашлось).
 * Любая ошибка → массив из null. Браузер сам Nominatim не зовёт (нет CORS).
 */
export async function geocodeQueries(queries: string[]): Promise<(Coords | null)[]> {
  if (queries.length === 0) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('geocode', { body: { queries } });
    if (error || !data || (data as { error?: string }).error) return queries.map(() => null);
    const list = (data as { coords?: unknown }).coords;
    if (!Array.isArray(list)) return queries.map(() => null);
    return queries.map((_, i) => toCoords(list[i]));
  } catch {
    return queries.map(() => null);
  }
}
