import { describe, it, expect } from 'vitest';
import {
  createTripDoc, createHotel, setFlights, setHotels, clearItinerary,
  ensureTripDefaults, addPlaceToTrip, type Flight,
} from '@/lib/entities';

const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-11' };

describe('перелёт и отели', () => {
  it('новая поездка имеет пустые flights/hotels', () => {
    const t = createTripDoc(base);
    expect(t.flights).toEqual([]);
    expect(t.hotels).toEqual([]);
  });

  it('setFlights/setHotels иммутабельно заменяют списки', () => {
    const t = createTripDoc(base);
    const f: Flight = { direction: 'out', airport: 'ICN', date: '2026-06-07', time: '11:35', flightNo: 'SU250' };
    const t2 = setFlights(t, [f]);
    expect(t2).not.toBe(t);
    expect(t2.flights).toEqual([f]);
    const h = createHotel({ name: 'Lotte', checkIn: '2026-06-07', checkOut: '2026-06-11' });
    const t3 = setHotels(t2, [h]);
    expect(t3.hotels[0].name).toBe('Lotte');
    expect(t3.hotels[0].id.startsWith('hotel_')).toBe(true);
    expect(t2.flights).toEqual([f]); // прежнее не потеряно
  });

  it('createHotel заполняет дефолты', () => {
    const h = createHotel();
    expect(h.name).toBe('');
    expect(h.coords).toBeNull();
    expect(typeof h.id).toBe('string');
  });
});

describe('clearItinerary', () => {
  it('убирает все места, не трогая перелёт/отели/дни', () => {
    let t = createTripDoc(base);
    t = addPlaceToTrip(t, 2, { name: 'X', coords: null, time: '', desc: '', price: null, image: '' });
    t = setFlights(t, [{ direction: 'out', airport: 'ICN', date: '2026-06-07', time: '11:35', flightNo: '' }]);
    t = setHotels(t, [createHotel({ name: 'Lotte' })]);
    const cleared = clearItinerary(t);
    expect(cleared.places).toEqual([]);
    expect(cleared.flights).toHaveLength(1);
    expect(cleared.hotels).toHaveLength(1);
    expect(cleared.days).toEqual(t.days);
  });

  it('пустой маршрут возвращает тот же объект', () => {
    const t = createTripDoc(base);
    expect(clearItinerary(t)).toBe(t);
  });
});

describe('ensureTripDefaults — flights/hotels', () => {
  it('догенерирует flights/hotels для старой поездки', () => {
    const t = createTripDoc(base);
    const old = { ...t } as Record<string, unknown>;
    delete old.flights; delete old.hotels;
    const fixed = ensureTripDefaults(old as never);
    expect(fixed.flights).toEqual([]);
    expect(fixed.hotels).toEqual([]);
  });

  it('не трогает поездку, где всё на месте', () => {
    const t = createTripDoc(base);
    expect(ensureTripDefaults(t)).toBe(t);
  });
});
