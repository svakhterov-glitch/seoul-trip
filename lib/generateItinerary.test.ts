import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем сеть: edge-функция generate-itinerary и геокодер.
const invoke = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ functions: { invoke } }) }));
const geocodeQueries = vi.fn();
vi.mock('@/lib/geocode', () => ({
  geocodeQueries: (...a: unknown[]) => geocodeQueries(...a),
  toCoords: (v: unknown) => (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' ? v : null),
  // центр города не зовёт geocodeQueries (отдельный мок) → последовательность для мест не сбивается
  cityCenter: async () => null,
  inRegion: (c: unknown) => c != null,
}));

import { cleanItineraryText, generateItinerary } from '@/lib/generateItinerary';

describe('cleanItineraryText', () => {
  it('декодирует числовые HTML-сущности', () => {
    expect(cleanItineraryText('Каф&#233; Onion')).toBe('Кафé Onion');
    expect(cleanItineraryText('Кор&#xe9;я')).toBe('Корéя');
  });

  it('убирает HTML-теги (например <br>)', () => {
    expect(cleanItineraryText('Мён<br>дон')).toBe('Мён дон');
    expect(cleanItineraryText('<b>Дворец</b>')).toBe('Дворец');
  });

  it('схлопывает пробелы и тримит', () => {
    expect(cleanItineraryText('  два   слова  ')).toBe('два слова');
  });

  it('декодирует амперсанд и кавычки', () => {
    expect(cleanItineraryText('Кафе &amp; бар')).toBe('Кафе & бар');
  });

  it('нестроку отдаёт пустой строкой', () => {
    expect(cleanItineraryText(null)).toBe('');
    expect(cleanItineraryText(undefined)).toBe('');
    expect(cleanItineraryText(42)).toBe('');
  });
});

describe('generateItinerary — точки и раскладка', () => {
  beforeEach(() => { invoke.mockReset(); geocodeQueries.mockReset(); });

  const input = {
    city: 'Сеул', country: 'Корея', startDate: '2026-06-07', endDate: '2026-06-08',
    days: 1, pace: 'moderate' as const, interests: [], restFirstDay: true,
  };

  it('повторно геокодит не найденные места (ретрай по «имя, город, страна»)', async () => {
    invoke.mockResolvedValue({ data: { places: [
      { dayNumber: 1, time: '10:00', name: 'A', geo: 'A geo' },
      { dayNumber: 1, time: '11:00', name: 'B', geo: 'B geo' },
    ] }, error: null });
    geocodeQueries
      .mockResolvedValueOnce([[1, 1], null])   // первый проход: B не найден
      .mockResolvedValueOnce([[2, 2]]);        // ретрай: B найден
    const draft = await generateItinerary(input);
    expect(geocodeQueries).toHaveBeenCalledTimes(2);
    const b = draft!.places.find((p) => p.name === 'B')!;
    expect(b.coords).toEqual([2, 2]);
  });

  it('место без точки: время убрано и оно в конце дня', async () => {
    invoke.mockResolvedValue({ data: { places: [
      { dayNumber: 1, time: '10:00', name: 'A', geo: 'A geo' },
      { dayNumber: 1, time: '11:00', name: 'B', geo: 'B geo' },  // не найдётся
      { dayNumber: 1, time: '12:00', name: 'C', geo: 'C geo' },
    ] }, error: null });
    geocodeQueries
      .mockResolvedValueOnce([[1, 1], null, [3, 3]])
      .mockResolvedValueOnce([null]);          // ретрай B тоже пустой
    const draft = await generateItinerary(input);
    const order = draft!.places.map((p) => p.name);
    expect(order).toEqual(['A', 'C', 'B']);     // B (без точки) — в конец дня
    const b = draft!.places.find((p) => p.name === 'B')!;
    expect(b.coords).toBeNull();
    expect(b.time).toBe('');                     // время убрано
  });
});
