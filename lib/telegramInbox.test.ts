import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем клиент Supabase: цепочка-билдер, awaitable через then → nextResult.
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };
function chain() {
  const b: Record<string, unknown> = { then: (resolve: (v: unknown) => void) => resolve(nextResult) };
  for (const m of ['select', 'eq', 'order', 'limit', 'update', 'insert', 'maybeSingle']) {
    b[m] = vi.fn(() => b);
  }
  return b;
}
const from = vi.fn(() => chain());
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ from }) }));

import { listSuggestions, ensureTelegramLink, telegramLinkStatus } from '@/lib/telegramInbox';

beforeEach(() => { from.mockClear(); nextResult = { data: null, error: null }; });

describe('listSuggestions', () => {
  it('маппит строки: kind/coords/поля; неизвестный kind → place', async () => {
    nextResult = { data: [
      { id: 1, kind: 'shopping', url: 'u', name: 'Маска', description: 'd', image: 'i', coords: [37.5, 127.0], from_user: 'Аня', created_at: 't1' },
      { id: 2, kind: 'weird', url: '', name: 'Кафе', description: '', image: '', coords: null, from_user: '', created_at: 't2' },
    ], error: null };
    const res = await listSuggestions('trip_1');
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({ id: '1', kind: 'shopping', coords: [37.5, 127.0], fromUser: 'Аня', name: 'Маска' });
    expect(res[1].kind).toBe('place');
    expect(res[1].coords).toBeNull();
  });

  it('ошибка/пусто → []', async () => {
    nextResult = { data: null, error: { message: 'x' } };
    expect(await listSuggestions('t')).toEqual([]);
  });
});

describe('telegramLinkStatus', () => {
  it('connected=true, если есть chat_id', async () => {
    nextResult = { data: { code: 'ABC234', chat_id: '42' }, error: null };
    expect(await telegramLinkStatus('trip_1')).toEqual({ code: 'ABC234', connected: true });
  });

  it('connected=false без chat_id; нет строки → null', async () => {
    nextResult = { data: { code: 'XYZ789', chat_id: null }, error: null };
    expect(await telegramLinkStatus('trip_1')).toEqual({ code: 'XYZ789', connected: false });
    nextResult = { data: null, error: null };
    expect(await telegramLinkStatus('trip_1')).toBeNull();
  });
});

describe('ensureTelegramLink', () => {
  it('возвращает существующую привязку, не создавая новую', async () => {
    nextResult = { data: { code: 'KEEP55', chat_id: '7' }, error: null };
    expect(await ensureTelegramLink('trip_1')).toEqual({ code: 'KEEP55', connected: true });
  });
});
