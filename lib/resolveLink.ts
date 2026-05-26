import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';

/** Результат серверного разбора ссылки (edge-функция `resolve-link`). */
export interface ResolvedLink {
  name: string;
  coords: Coords | null;
  desc: string;        // краткое описание места (Haiku / og:description)
  image: string;       // фото со страницы (og:image), '' если нет
  displayName: string; // адрес из геокодера (если координаты добыты по названию)
  sourceUrl: string;   // развёрнутый URL (после редиректов короткой ссылки)
}

/**
 * Разобрать ссылку на сервере: развернуть редирект (короткие maps.app.goo.gl и
 * т.п.), достать координаты/имя из URL или заголовка страницы, при включённом
 * ключе — уточнить через ИИ и геокодить. Браузер так не может (CORS), поэтому
 * работа уходит в edge-функцию. Любая ошибка/недоступность → `null` (ссылка
 * просто остаётся неразобранной, без регресса).
 */
export async function resolveLink(url: string): Promise<ResolvedLink | null> {
  const u = (url || '').trim();
  if (!u) return null;
  try {
    const { data, error } = await getSupabase().functions.invoke('resolve-link', { body: { url: u } });
    if (error || !data || (data as { error?: string }).error) return null;
    const d = data as { name?: unknown; coords?: unknown; desc?: unknown; description?: unknown; image?: unknown; displayName?: unknown; sourceUrl?: unknown };
    const coords = Array.isArray(d.coords) && d.coords.length === 2
      && typeof d.coords[0] === 'number' && typeof d.coords[1] === 'number'
      ? ([d.coords[0], d.coords[1]] as Coords)
      : null;
    const desc = typeof d.description === 'string' ? d.description : (typeof d.desc === 'string' ? d.desc : '');
    return {
      name: typeof d.name === 'string' ? d.name : '',
      coords,
      desc,
      image: typeof d.image === 'string' ? d.image : '',
      displayName: typeof d.displayName === 'string' ? d.displayName : '',
      sourceUrl: typeof d.sourceUrl === 'string' && d.sourceUrl ? d.sourceUrl : u,
    };
  } catch {
    return null;
  }
}
