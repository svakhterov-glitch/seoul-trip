import { describe, it, expect, vi } from 'vitest';
import { listTrips, createTrip, getTrip, updateTrip } from '@/lib/trips';
import type { SupabaseClient } from '@supabase/supabase-js';

function fakeClientForList(rows: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient;
}

describe('listTrips', () => {
  it('разворачивает row.data в объект поездки с id', async () => {
    const client = fakeClientForList([
      { id: 'trip_1', data: { id: 'trip_1', title: 'Сеул', city: 'Сеул' }, created_at: 'x' },
    ]);
    const trips = await listTrips(client);
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip_1');
    expect(trips[0].title).toBe('Сеул');
  });

  it('пустой результат → []', async () => {
    const trips = await listTrips(fakeClientForList([]));
    expect(trips).toEqual([]);
  });

  it('ошибка Supabase → исключение', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { from: () => ({ select: () => ({ order }) }) } as unknown as SupabaseClient;
    await expect(listTrips(client)).rejects.toThrow();
  });
});

describe('createTrip', () => {
  it('вставляет { id, data } и возвращает документ', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as SupabaseClient;
    const doc = { id: 'trip_x', title: 'Токио' } as never;
    const res = await createTrip(client, doc);
    expect(insert).toHaveBeenCalledWith({ id: 'trip_x', data: doc });
    expect(res).toBe(doc);
  });

  it('ошибка вставки → исключение', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'rls' } });
    const client = { from: () => ({ insert }) } as unknown as SupabaseClient;
    await expect(createTrip(client, { id: 'a' } as never)).rejects.toThrow();
  });
});

describe('getTrip', () => {
  it('возвращает документ с id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'trip_1', data: { id: 'trip_1', title: 'Сеул' } }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient;
    const trip = await getTrip(client, 'trip_1');
    expect(trip?.id).toBe('trip_1');
    expect(trip?.title).toBe('Сеул');
    expect(eq).toHaveBeenCalledWith('id', 'trip_1');
  });

  it('нет строки → null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient;
    expect(await getTrip(client, 'nope')).toBeNull();
  });

  it('ошибка → исключение', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient;
    await expect(getTrip(client, 'x')).rejects.toThrow();
  });
});

describe('updateTrip', () => {
  it('пишет data по id и возвращает документ', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;
    const doc = { id: 'trip_x', title: 'Токио' } as never;
    const res = await updateTrip(client, doc);
    expect(update).toHaveBeenCalledWith({ data: doc });
    expect(eq).toHaveBeenCalledWith('id', 'trip_x');
    expect(res).toBe(doc);
  });

  it('ошибка → исключение', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'rls' } });
    const client = { from: () => ({ update: () => ({ eq }) }) } as unknown as SupabaseClient;
    await expect(updateTrip(client, { id: 'a' } as never)).rejects.toThrow();
  });
});
