import { describe, it, expect } from 'vitest';
import { createTripDoc, addPlaceToTrip, updateDay, reorderDays, movableDayNumbers, placesForDay } from '@/lib/entities';

// 5 дней: 1 — прилёт, 5 — вылет; средние 2,3,4 переставляются.
const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-08', endDate: '2026-06-12' };

function setup() {
  let t = createTripDoc(base);
  for (const n of [2, 3, 4]) {
    t = updateDay(t, n, { title: `День-${n}`, sub: `sub${n}`, cat: `c${n}` });
    t = addPlaceToTrip(t, n, { name: `Место-${n}`, coords: null, time: '', desc: '', price: null, image: '' });
  }
  return t;
}

describe('reorderDays', () => {
  it('movableDayNumbers — без первого и последнего', () => {
    expect(movableDayNumbers(setup())).toEqual([2, 3, 4]);
  });

  it('переставляет содержимое и места по новому порядку; даты на месте', () => {
    const t = setup();
    const dates = t.days.map((d) => d.date);
    // хотим порядок средних: 4,2,3 → слот2←день4, слот3←день2, слот4←день3
    const next = reorderDays(t, [4, 2, 3]);
    expect(next.days.find((d) => d.number === 2)!.title).toBe('День-4');
    expect(next.days.find((d) => d.number === 3)!.title).toBe('День-2');
    expect(next.days.find((d) => d.number === 4)!.title).toBe('День-3');
    expect(next.days.map((d) => d.date)).toEqual(dates); // даты не двигались
    expect(placesForDay(next, 2).map((p) => p.name)).toEqual(['Место-4']);
    expect(placesForDay(next, 3).map((p) => p.name)).toEqual(['Место-2']);
    expect(placesForDay(next, 4).map((p) => p.name)).toEqual(['Место-3']);
  });

  it('первый и последний день не трогаются', () => {
    const t = setup();
    const next = reorderDays(t, [4, 3, 2]);
    expect(next.days.find((d) => d.number === 1)!.cat).toBe(t.days.find((d) => d.number === 1)!.cat);
    expect(next.days.find((d) => d.number === 5)!.cat).toBe(t.days.find((d) => d.number === 5)!.cat);
  });

  it('кривой/неполный порядок → исходный документ', () => {
    const t = setup();
    expect(reorderDays(t, [2, 3])).toBe(t);        // не все средние
    expect(reorderDays(t, [2, 2, 3])).toBe(t);     // дубль
    expect(reorderDays(t, [2, 3, 5])).toBe(t);     // 5 — закреплён, не средний
    expect(reorderDays(t, [2, 3, 4])).toBe(t);     // порядок не изменился
  });

  it('иммутабельно', () => {
    const t = setup();
    const next = reorderDays(t, [4, 2, 3]);
    expect(next).not.toBe(t);
    expect(t.days.find((d) => d.number === 2)!.title).toBe('День-2');
  });
});
