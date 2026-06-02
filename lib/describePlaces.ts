import { getSupabase } from '@/lib/supabase/client';

/**
 * Краткие описания мест (одна фраза) через edge-функцию `describe-places`
 * (Haiku, без веб-поиска). Возвращает массив в том же порядке (`''` где не вышло).
 * Любая ошибка → массив пустых строк (без регресса).
 */
export async function describePlaces(names: string[], city: string, country: string): Promise<string[]> {
  if (names.length === 0) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('describe-places', {
      body: { names, city, country },
    });
    if (error || !data || (data as { error?: string }).error) return names.map(() => '');
    const list = (data as { descriptions?: unknown }).descriptions;
    if (!Array.isArray(list)) return names.map(() => '');
    return names.map((_, i) => (typeof list[i] === 'string' ? list[i] : ''));
  } catch {
    return names.map(() => '');
  }
}
