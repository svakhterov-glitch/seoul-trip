import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';

/** Кандидат места из поиска по названию (edge-функция `search-places`). */
export interface PlaceCandidate {
  name: string;     // короткое название (по-русски, если ИИ распознал место)
  address: string;  // адрес из геокодера — вторая строка, чтобы различать совпадения
  desc: string;     // краткое описание ('' если нет)
  coords: Coords;   // [широта, долгота] — у кандидата всегда есть точка
}

/**
 * Найти места по названию в пределах города поездки. Работа уходит на сервер
 * (edge-функция: ИИ уточняет названия + геокодер даёт координаты), потому что
 * браузеру это не по силам (CORS, ключи). Любая ошибка → пустой список (поиск
 * просто ничего не нашёл, без регресса). Кандидаты без координат отсеиваются.
 */
export async function searchPlaces(query: string, city: string, country = ''): Promise<PlaceCandidate[]> {
  const q = (query || '').trim();
  if (!q) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('search-places', {
      body: { query: q, city, country },
    });
    if (error || !data || (data as { error?: string }).error) return [];
    const list = (data as { candidates?: unknown }).candidates;
    if (!Array.isArray(list)) return [];
    return list
      .map((raw): PlaceCandidate | null => {
        const c = raw as { name?: unknown; address?: unknown; desc?: unknown; description?: unknown; coords?: unknown };
        const coords = Array.isArray(c.coords) && c.coords.length === 2
          && typeof c.coords[0] === 'number' && typeof c.coords[1] === 'number'
          ? ([c.coords[0], c.coords[1]] as Coords)
          : null;
        const name = typeof c.name === 'string' ? c.name.trim() : '';
        if (!coords || !name) return null;
        return {
          name,
          address: typeof c.address === 'string' ? c.address : '',
          desc: typeof c.desc === 'string' ? c.desc : (typeof c.description === 'string' ? c.description : ''),
          coords,
        };
      })
      .filter((c): c is PlaceCandidate => c !== null);
  } catch {
    return [];
  }
}

/** Ссылка «открыть на карте» для найденного места — Google Maps поиск по имени+городу. */
export function placeMapsUrl(name: string, city: string): string {
  const q = [name, city].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
