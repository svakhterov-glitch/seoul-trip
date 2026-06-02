import { describe, it, expect } from 'vitest';
import { createTripDoc, addPlaceToTrip, moveDay, updateDay, placesForDay } from '@/lib/entities';

// Поездка на 4 дня (1 — прилёт, 4 — вылет; двигаются только 2 и 3).
const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-08', endDate: '2026-06-11' };

function setup() {
  let t = createTripDoc(base);
  // дадим дням узнаваемые заголовки
  t = updateDay(t, 2, { title: 'День-2', sub: 'sub2', cat: 'a' });
  t = updateDay(t, 3, { title: 'День-3', sub: 'sub3', cat: 'b' });
  t = addPlaceToTrip(t, 2, { name: 'Место-2', coords: null, time: '', desc: '', price: null, image: '' });
  t = addPlaceToTrip(t, 3, { name: 'Место-3', coords: null, time: '', desc: '', price: null, image: '' });
  return t;
}

describe('moveDay', () => {
  it('меняет содержимое и места соседних дней; даты остаются на позициях', () => {
    const t = setup();
    const date2 = t.days.find((d) => d.number === 2)!.date;
    const date3 = t.days.find((d) => d.number === 3)!.date;
    const next = moveDay(t, 2, 1); // день 2 → позже (меняется с 3)
    const d2 = next.days.find((d) => d.number === 2)!;
    const d3 = next.days.find((d) => d.number === 3)!;
    expect(d2.title).toBe('День-3');         // в слот 2 переехал контент дня 3
    expect(d3.title).toBe('День-2');
    expect(d2.date).toBe(date2);             // даты не двигались
    expect(d3.date).toBe(date3);
    expect(placesForDay(next, 2).map((p) => p.name)).toEqual(['Место-3']);
    expect(placesForDay(next, 3).map((p) => p.name)).toEqual(['Место-2']);
  });

  it('первый и последний день не двигаются', () => {
    const t = setup();
    expect(moveDay(t, 1, 1)).toBe(t);   // прилёт
    expect(moveDay(t, 4, -1)).toBe(t);  // вылет
  });

  it('нельзя заехать в слот первого/последнего дня', () => {
    const t = setup();
    expect(moveDay(t, 2, -1)).toBe(t);  // 2 вверх → в слот 1 (нельзя)
    expect(moveDay(t, 3, 1)).toBe(t);   // 3 вниз → в слот 4 (нельзя)
  });

  it('иммутабельно', () => {
    const t = setup();
    const next = moveDay(t, 2, 1);
    expect(next).not.toBe(t);
    expect(t.days.find((d) => d.number === 2)!.title).toBe('День-2'); // исходник цел
  });
});
