import { describe, it, expect } from 'vitest';
import {
  createTripDoc, DEFAULT_CATEGORIES,
  ensureDays, ensureTripDefaults, updateTripMeta, placesForDay, getDay, lastDayNumber,
  addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip,
} from '@/lib/entities';

describe('createTripDoc', () => {
  const input = { title: ' Сеул ', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' };

  it('тримит название и заполняет поля', () => {
    const t = createTripDoc(input);
    expect(t.title).toBe('Сеул');
    expect(t.country).toBe('Корея');
    expect(t.city).toBe('Сеул');
    expect(t.startDate).toBe('2026-06-07');
    expect(t.endDate).toBe('2026-06-15');
  });

  it('даёт непустой строковый id с префиксом trip_', () => {
    const t = createTripDoc(input);
    expect(typeof t.id).toBe('string');
    expect(t.id.startsWith('trip_')).toBe(true);
  });

  it('инициализирует пустые коллекции и дефолтные категории', () => {
    const t = createTripDoc(input);
    expect(t.places).toEqual([]);
    expect(t.inbox).toEqual([]);
    expect(t.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('генерирует каркас дней из дат (включительно)', () => {
    const t = createTripDoc(input);
    expect(t.days).toHaveLength(9);
    expect(t.days[0].number).toBe(1);
  });

  it('генерирует разные id', () => {
    expect(createTripDoc(input).id).not.toBe(createTripDoc(input).id);
  });
});

describe('ensureDays', () => {
  it('догенерирует дни, если их нет', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const empty = { ...t, days: [] };
    const fixed = ensureDays(empty);
    expect(fixed.days).toHaveLength(3);
  });
  it('не трогает поездку с днями', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(ensureDays(t)).toBe(t);
  });
});

describe('createTripDoc — спутники', () => {
  it('новая поездка имеет пустой список спутников', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(t.companions).toEqual([]);
  });
});

describe('ensureTripDefaults', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('проставляет companions старой поездке без этого поля', () => {
    const t = make();
    const old = { ...t } as Record<string, unknown>;
    delete old.companions;
    const fixed = ensureTripDefaults(old as never);
    expect(fixed.companions).toEqual([]);
  });
  it('догенерирует дни, если их нет', () => {
    const fixed = ensureTripDefaults({ ...make(), days: [] });
    expect(fixed.days).toHaveLength(3);
  });
  it('не трогает уже корректную поездку', () => {
    const t = make();
    expect(ensureTripDefaults(t)).toBe(t);
  });
});

describe('updateTripMeta', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('меняет название, описание и спутников, не трогая остального', () => {
    const t = make();
    const next = updateTripMeta(t, { title: 'Сеул', lead: 'Весна', companions: ['Аня'] });
    expect(next).toMatchObject({ title: 'Сеул', lead: 'Весна', companions: ['Аня'] });
    expect(next.city).toBe(t.city);
    expect(t.title).toBe('X'); // исходник не мутирован
  });
});

describe('мутации мест (иммутабельно)', () => {
  const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('addPlaceToTrip добавляет место в конец дня с order', () => {
    const t1 = addPlaceToTrip(base, 2, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const t2 = addPlaceToTrip(t1, 2, { name: 'Парк', coords: [37.6, 127.1], time: '', desc: '', price: null, image: '' });
    const day2 = placesForDay(t2, 2);
    expect(day2.map((p) => p.name)).toEqual(['Кафе', 'Парк']);
    expect(day2[0].order).toBe(0);
    expect(day2[1].order).toBe(1);
    expect(base.places).toHaveLength(0); // исходник не мутирован
  });

  it('updatePlaceInTrip меняет поля места', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = updatePlaceInTrip(t1, id, { name: 'Кофейня', time: '10:00' });
    expect(placesForDay(t2, 1)[0]).toMatchObject({ name: 'Кофейня', time: '10:00' });
  });

  it('removePlaceFromTrip удаляет место', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = removePlaceFromTrip(t1, id);
    expect(placesForDay(t2, 1)).toHaveLength(0);
  });
});

describe('помощники чтения', () => {
  const t = addPlaceToTrip(
    createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' }),
    2, { name: 'A', coords: [37, 127], time: '', desc: '', price: null, image: '' });
  it('getDay по номеру', () => { expect(getDay(t, 2)?.number).toBe(2); });
  it('lastDayNumber', () => { expect(lastDayNumber(t)).toBe(3); });
});
