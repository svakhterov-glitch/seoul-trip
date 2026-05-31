import { describe, it, expect } from 'vitest';
import {
  createTripDoc, addPlaceToTrip, applyItinerary, placesForDay,
  type ItineraryDraft,
} from '@/lib/entities';

const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-11' };

function draft(places: Partial<ItineraryDraft['places'][number]>[]): ItineraryDraft {
  return {
    places: places.map((p) => ({
      dayNumber: 1, name: 'X', coords: null, desc: '', price: null, kind: '',
      by: '', sourceUrl: '', sourceDate: '', seasonNote: '', district: '', ...p,
    })),
  };
}

describe('applyItinerary', () => {
  it('кладёт места ИИ в указанные дни с source:"ai"', () => {
    const trip = createTripDoc(base);
    const next = applyItinerary(trip, draft([
      { dayNumber: 2, name: 'Кафе А', by: 'Time Out Seoul', district: 'Ыйджон' },
      { dayNumber: 2, name: 'Парк Б' },
      { dayNumber: 3, name: 'Музей В' },
    ]));
    const day2 = placesForDay(next, 2);
    expect(day2.map((p) => p.name)).toEqual(['Кафе А', 'Парк Б']);
    expect(day2.every((p) => p.source === 'ai')).toBe(true);
    expect(day2[0].by).toBe('Time Out Seoul');
    expect(placesForDay(next, 3)).toHaveLength(1);
  });

  it('не трогает уже разложенные руками места — дописывает после них', () => {
    let trip = createTripDoc(base);
    trip = addPlaceToTrip(trip, 2, { name: 'Моё место', coords: null, time: '', desc: '', price: null, image: '' });
    const next = applyItinerary(trip, draft([{ dayNumber: 2, name: 'Место ИИ' }]));
    const day2 = placesForDay(next, 2);
    expect(day2.map((p) => p.name)).toEqual(['Моё место', 'Место ИИ']);
    expect(day2.map((p) => p.order)).toEqual([0, 1]); // нумерация продолжается
    expect(day2[0].source).toBe('manual'); // ручное место не изменено
  });

  it('отбрасывает места вне каркаса дней и с пустым именем', () => {
    const trip = createTripDoc(base); // дни 1..5
    const next = applyItinerary(trip, draft([
      { dayNumber: 0, name: 'Вне дней' },
      { dayNumber: 99, name: 'Слишком далеко' },
      { dayNumber: 1, name: '   ' },
      { dayNumber: 1, name: 'Ок' },
    ]));
    expect(next.places).toHaveLength(1);
    expect(next.places[0].name).toBe('Ок');
  });

  it('пустой черновик возвращает тот же объект', () => {
    const trip = createTripDoc(base);
    expect(applyItinerary(trip, { places: [] })).toBe(trip);
  });

  it('переносит проверочные поля (sourceDate/seasonNote/district)', () => {
    const trip = createTripDoc(base);
    const next = applyItinerary(trip, draft([{
      dayNumber: 1, name: 'Намсан', sourceDate: '2026-04-01',
      seasonNote: 'в июне — зелень, без клёнов', district: 'Намсан',
    }]));
    const p = placesForDay(next, 1)[0];
    expect(p.sourceDate).toBe('2026-04-01');
    expect(p.seasonNote).toBe('в июне — зелень, без клёнов');
    expect(p.district).toBe('Намсан');
  });
});
