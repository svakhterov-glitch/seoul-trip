import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем клиент Supabase — у функции invoke подменяем ответ под каждый кейс.
const invoke = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));

import { searchPlaces, placeMapsUrl } from '@/lib/searchPlaces';

describe('searchPlaces', () => {
  beforeEach(() => invoke.mockReset());

  it('возвращает кандидатов из ответа функции', async () => {
    invoke.mockResolvedValue({
      data: { candidates: [
        { name: 'Кёнбоккун', address: 'Сеул, Корея', desc: 'Дворец', coords: [37.579, 126.977] },
        { name: 'Чхандоккун', address: 'Сеул', description: 'Дворец-2', coords: [37.582, 126.991] },
      ] },
      error: null,
    });
    const r = await searchPlaces('дворец', 'Сеул', 'Корея');
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ name: 'Кёнбоккун', address: 'Сеул, Корея', desc: 'Дворец', coords: [37.579, 126.977] });
    expect(r[1].desc).toBe('Дворец-2'); // поле description тоже подхватываем
    expect(invoke).toHaveBeenCalledWith('search-places', { body: { query: 'дворец', city: 'Сеул', country: 'Корея' } });
  });

  it('отсеивает кандидатов без координат или без имени', async () => {
    invoke.mockResolvedValue({
      data: { candidates: [
        { name: 'Норм', coords: [37.5, 127.0] },
        { name: 'Без точки', coords: null },
        { name: '', coords: [1, 2] },
        { name: 'Кривые', coords: ['a', 'b'] },
      ] },
      error: null,
    });
    const r = await searchPlaces('x', 'Сеул');
    expect(r).toEqual([{ name: 'Норм', address: '', desc: '', coords: [37.5, 127.0] }]);
  });

  it('пустой запрос → [] без вызова функции', async () => {
    expect(await searchPlaces('  ', 'Сеул')).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('ошибка функции или тело с error → []', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await searchPlaces('x', 'Сеул')).toEqual([]);
    invoke.mockResolvedValue({ data: { error: 'no query' }, error: null });
    expect(await searchPlaces('x', 'Сеул')).toEqual([]);
  });

  it('candidates не массив → []', async () => {
    invoke.mockResolvedValue({ data: { candidates: 'nope' }, error: null });
    expect(await searchPlaces('x', 'Сеул')).toEqual([]);
  });
});

describe('placeMapsUrl', () => {
  it('строит Google Maps поиск по имени + городу', () => {
    expect(placeMapsUrl('Cafe Onion', 'Сеул')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Cafe%20Onion%20%D0%A1%D0%B5%D1%83%D0%BB',
    );
  });
});
