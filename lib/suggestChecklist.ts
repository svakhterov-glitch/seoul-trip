import { getSupabase } from '@/lib/supabase/client';

export interface SuggestChecklistInput {
  name: string;
  city: string;
  country?: string;
  kind?: string;
}

/**
 * Попросить ИИ предложить пункты чеклиста для места (что посмотреть/купить).
 * Работа на сервере (edge-функция `suggest-checklist`, Haiku без веб-поиска).
 * Любая ошибка → пустой список (просто ничего не предложили, без регресса).
 */
export async function suggestChecklist(input: SuggestChecklistInput): Promise<string[]> {
  const name = (input.name || '').trim();
  if (!name) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('suggest-checklist', {
      body: { name, city: input.city || '', country: input.country || '', kind: input.kind || '' },
    });
    if (error || !data || (data as { error?: string }).error) return [];
    const list = (data as { items?: unknown }).items;
    if (!Array.isArray(list)) return [];
    return list.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}
