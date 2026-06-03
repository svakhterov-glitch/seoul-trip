import { getSupabase } from '@/lib/supabase/client';

/**
 * Картинки под названия мест через edge-функцию `image-search` (Kakao image
 * search). Возвращает массив URL-миниатюр в том же порядке (`null` где не нашлось).
 * Любая ошибка → массив null (без регресса).
 */
export async function searchImages(queries: string[]): Promise<(string | null)[]> {
  if (queries.length === 0) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('image-search', {
      body: { queries },
    });
    if (error || !data || (data as { error?: string }).error) return queries.map(() => null);
    const list = (data as { images?: unknown }).images;
    if (!Array.isArray(list)) return queries.map(() => null);
    return queries.map((_, i) => (typeof list[i] === 'string' ? list[i] : null));
  } catch {
    return queries.map(() => null);
  }
}
