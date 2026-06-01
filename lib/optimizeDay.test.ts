import { describe, it, expect } from 'vitest';
import {
  createTripDoc, addPlaceToTrip, optimizeDayOrder, togglePlaceLock, placesForDay, type Coords,
} from '@/lib/entities';

const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-11' };

function addP(trip: ReturnType<typeof createTripDoc>, name: string, coords: Coords | null, time = '') {
  return addPlaceToTrip(trip, 2, { name, coords, time, desc: '', price: null, image: '' });
}

describe('optimizeDayOrder', () => {
  it('переставляет точки в порядок «ближайший сосед» (убирает зигзаг)', () => {
    // A(0)→B(3)→C(1)→D(2): зигзаг; оптимум от A: A,C,D,B
    let t = createTripDoc(base);
    t = addP(t, 'A', [0, 0]);
    t = addP(t, 'B', [0, 3]);
    t = addP(t, 'C', [0, 1]);
    t = addP(t, 'D', [0, 2]);
    const opt = optimizeDayOrder(t, 2);
    expect(placesForDay(opt, 2).map((p) => p.name)).toEqual(['A', 'C', 'D', 'B']);
  });

  it('времена переставляются по новому порядку (утро→вечер)', () => {
    let t = createTripDoc(base);
    t = addP(t, 'A', [0, 0], '10:00');
    t = addP(t, 'B', [0, 3], '11:00');
    t = addP(t, 'C', [0, 1], '12:00');
    t = addP(t, 'D', [0, 2], '13:00');
    const opt = placesForDay(optimizeDayOrder(t, 2), 2);
    expect(opt.map((p) => [p.name, p.time])).toEqual([['A', '10:00'], ['C', '11:00'], ['D', '12:00'], ['B', '13:00']]);
  });

  it('менее 3 точек с координатами — без изменений', () => {
    let t = createTripDoc(base);
    t = addP(t, 'A', [0, 0]);
    t = addP(t, 'B', [0, 3]);
    expect(optimizeDayOrder(t, 2)).toBe(t);
  });

  it('места без координат остаются в конце', () => {
    let t = createTripDoc(base);
    t = addP(t, 'A', [0, 0]);
    t = addP(t, 'B', [0, 3]);
    t = addP(t, 'C', [0, 1]);
    t = addP(t, 'Без точки', null);
    const names = placesForDay(optimizeDayOrder(t, 2), 2).map((p) => p.name);
    expect(names[names.length - 1]).toBe('Без точки');
  });

  it('замкнутое место остаётся на своей позиции', () => {
    let t = createTripDoc(base);
    t = addP(t, 'A', [0, 0]);
    t = addP(t, 'B', [0, 3]);
    t = addP(t, 'C', [0, 1]);
    t = addP(t, 'D', [0, 2]);
    // замкнём B (индекс 1) — он должен остаться на позиции 1
    const bId = placesForDay(t, 2)[1].id;
    t = togglePlaceLock(t, bId);
    const names = placesForDay(optimizeDayOrder(t, 2), 2).map((p) => p.name);
    expect(names[1]).toBe('B');
  });
});
