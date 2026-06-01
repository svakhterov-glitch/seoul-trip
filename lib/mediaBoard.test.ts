import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));

import { fetchMediaBoard } from '@/lib/mediaBoard';

// trends отдаёт места с geo (без координат), geocode возвращает координаты.
function mockFlow(items: unknown[], coords?: (number[] | null)[]) {
  invoke.mockImplementation((fn: string, opts: { body: { queries?: string[] } }) => {
    if (fn === 'trends') return Promise.resolve({ data: { items }, error: null });
    if (fn === 'geocode') {
      const qs = opts.body.queries ?? [];
      return Promise.resolve({ data: { coords: coords ?? qs.map(() => [37.5, 127.0]) }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

describe('fetchMediaBoard', () => {
  beforeEach(() => invoke.mockReset());

  it('нормализует items и проставляет координаты через geocode', async () => {
    mockFlow([
      { name: 'Кафе Onion', geo: 'Onion, Seoul', segment: 'food', rubric: 'new', blurb: 'модное', source: 'Time Out Seoul', sourceDate: '2025' },
      { name: 'Смотровая', geo: 'Tower, Seoul', segment: 'sight', rubric: 'best' },
    ], [[37.5, 127.0], [37.55, 127.02]]);
    const r = await fetchMediaBoard('Токио', 'Япония');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ name: 'Кафе Onion', coords: [37.5, 127.0], segment: 'food', rubric: 'new', source: 'Time Out Seoul' });
    expect(r[0].id).toBeTruthy();
    expect(invoke).toHaveBeenCalledWith('trends', { body: { city: 'Токио', country: 'Япония', exclude: [] } });
  });

  it('место без координат сохраняется (coords=null), кривая рубрика → trending', async () => {
    mockFlow([{ name: 'Без точки', geo: '', rubric: 'xxx' }], [null]);
    const r = await fetchMediaBoard('Токио');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ coords: null, rubric: 'trending', segment: 'other' });
  });

  it('пустой город → [] без вызова', async () => {
    expect(await fetchMediaBoard('  ')).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('демо-город (Сеул) отдаёт фикстуру без вызова функции', async () => {
    const r = await fetchMediaBoard('Сеул');
    expect(r.length).toBeGreaterThanOrEqual(6);
    expect(r.every((x) => x.sourceUrl.startsWith('https://'))).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('ошибка функции trends → []', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await fetchMediaBoard('Токио')).toEqual([]);
    invoke.mockResolvedValue({ data: { error: 'no city' }, error: null });
    expect(await fetchMediaBoard('Токио')).toEqual([]);
    invoke.mockResolvedValue({ data: { items: 'nope' }, error: null });
    expect(await fetchMediaBoard('Токио')).toEqual([]);
  });

  it('элемент без имени отбрасывается', async () => {
    mockFlow([{ name: '', geo: 'x' }, { name: 'Ok', geo: 'y' }]);
    const r = await fetchMediaBoard('Токио');
    expect(r.map((x) => x.name)).toEqual(['Ok']);
  });
});
