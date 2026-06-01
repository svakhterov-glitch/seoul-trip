import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';

/** Входящее предложение из Telegram-предложки (таблица tg_suggestions). */
export interface TgSuggestion {
  id: string;
  kind: 'place' | 'shopping';
  url: string;
  name: string;
  description: string;
  image: string;
  coords: Coords | null;
  fromUser: string;
  createdAt: string;
}

/** Статус привязки Telegram-группы к поездке (таблица tg_links). */
export interface TgLinkStatus {
  code: string;
  connected: boolean; // chat_id проставлен ботом (после /connect)
}

function toCoords(v: unknown): Coords | null {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
    ? [v[0], v[1]] as Coords : null;
}

/** Новые (необработанные) предложения поездки, свежие сверху. */
export async function listSuggestions(tripId: string): Promise<TgSuggestion[]> {
  const { data, error } = await getSupabase()
    .from('tg_suggestions')
    .select('id,kind,url,name,description,image,coords,from_user,created_at')
    .eq('trip_id', tripId)
    .eq('status', 'new')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    kind: r.kind === 'shopping' ? 'shopping' : 'place',
    url: typeof r.url === 'string' ? r.url : '',
    name: typeof r.name === 'string' ? r.name : '',
    description: typeof r.description === 'string' ? r.description : '',
    image: typeof r.image === 'string' ? r.image : '',
    coords: toCoords(r.coords),
    fromUser: typeof r.from_user === 'string' ? r.from_user : '',
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
  }));
}

/** Пометить предложение обработанным ('added') или скрытым ('dismissed'). */
export async function markSuggestion(id: string, status: 'added' | 'dismissed'): Promise<void> {
  await getSupabase().from('tg_suggestions').update({ status }).eq('id', id);
}

/** Дописать в предложение разобранные данные (фото/описание/координаты). */
export async function updateSuggestion(
  id: string,
  fields: { image?: string; description?: string; coords?: Coords | null },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.image !== undefined) patch.image = fields.image;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.coords !== undefined) patch.coords = fields.coords;
  if (Object.keys(patch).length === 0) return;
  await getSupabase().from('tg_suggestions').update(patch).eq('id', id);
}

/** Короткий читаемый код привязки (без похожих символов 0/O/1/I). */
function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => alphabet[n % alphabet.length]).join('');
}

/** Текущая привязка поездки или null (если ещё не создавали). */
export async function telegramLinkStatus(tripId: string): Promise<TgLinkStatus | null> {
  const { data, error } = await getSupabase()
    .from('tg_links')
    .select('code,chat_id')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { code: string; chat_id: string | null };
  return { code: row.code, connected: !!row.chat_id };
}

/**
 * Получить код привязки поездки: если уже есть — вернуть его, иначе создать.
 * Возвращает статус (код + подключено ли). user_id проставляется БД (auth.uid()).
 */
export async function ensureTelegramLink(tripId: string): Promise<TgLinkStatus | null> {
  const existing = await telegramLinkStatus(tripId);
  if (existing) return existing;
  const code = genCode();
  const { error } = await getSupabase().from('tg_links').insert({ code, trip_id: tripId });
  if (error) return null;
  return { code, connected: false };
}
