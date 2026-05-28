import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';
import type { MediaItem, MediaRubric } from '@/lib/media';
import { demoMediaFor } from '@/lib/mediaDemo';

const RUBRICS: MediaRubric[] = ['new', 'best', 'trending'];

let counter = 0;
function newId(): string {
  counter += 1;
  return `media_${Date.now().toString(36)}_${counter}`;
}

/**
 * Получить доску «Медиа» города: трендовые места из редакционных подборок.
 * Работа на сервере (edge-функция `trends`: ИИ предлагает места, геокодер даёт
 * координаты). Любая ошибка → пустой список (просто покажем «ничего не нашлось»).
 * Места без координат сохраняем — они есть в витрине, но не на карте.
 */
export async function fetchMediaBoard(city: string, country = ''): Promise<MediaItem[]> {
  const c = (city || '').trim();
  if (!c) return [];
  // Путь A (демо без бэкенда): для городов из набора отдаём готовую фикстуру
  // реальных мест с живыми ссылками на источники. См. lib/mediaDemo.ts.
  const demo = demoMediaFor(c);
  if (demo) return demo;
  try {
    const { data, error } = await getSupabase().functions.invoke('trends', { body: { city: c, country } });
    if (error || !data || (data as { error?: string }).error) return [];
    const list = (data as { items?: unknown; trends?: unknown }).items ?? (data as { trends?: unknown }).trends;
    if (!Array.isArray(list)) return [];
    return list
      .map(normalize)
      .filter((x): x is MediaItem => x !== null);
  } catch {
    return [];
  }
}

function normalize(raw: unknown): MediaItem | null {
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return null;
  const coords = Array.isArray(r.coords) && r.coords.length === 2
    && typeof r.coords[0] === 'number' && typeof r.coords[1] === 'number'
    ? ([r.coords[0], r.coords[1]] as Coords)
    : null;
  const rubric = (typeof r.rubric === 'string' && RUBRICS.includes(r.rubric as MediaRubric))
    ? (r.rubric as MediaRubric) : 'trending';
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name,
    coords,
    segment: typeof r.segment === 'string' && r.segment ? r.segment : 'other',
    rubric,
    blurb: typeof r.blurb === 'string' ? r.blurb : '',
    image: typeof r.image === 'string' ? r.image : '',
    source: typeof r.source === 'string' ? r.source : '',
    sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : '',
    sourceDate: typeof r.sourceDate === 'string' ? r.sourceDate : '',
  };
}
