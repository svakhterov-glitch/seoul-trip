import { describe, it, expect } from 'vitest';
import { haversineKm, inRegion, toCoords, REGION_RADIUS_KM } from '@/lib/geocode';
import type { Coords } from '@/lib/entities';

const SEOUL: Coords = [37.5665, 126.978];
const BUSAN: Coords = [35.1796, 129.0756];
const SAO_PAULO: Coords = [-23.5505, -46.6333];

describe('haversineKm', () => {
  it('Сеул→Пусан ≈ 325 км', () => {
    expect(haversineKm(SEOUL, BUSAN)).toBeGreaterThan(300);
    expect(haversineKm(SEOUL, BUSAN)).toBeLessThan(340);
  });
  it('Сеул→Сан-Паулу — десятки тысяч км', () => {
    expect(haversineKm(SEOUL, SAO_PAULO)).toBeGreaterThan(15000);
  });
  it('одна точка — 0', () => {
    expect(haversineKm(SEOUL, SEOUL)).toBeCloseTo(0, 5);
  });
});

describe('inRegion', () => {
  it('Пусан в регионе Сеула (вся Корея в радиусе)', () => {
    expect(inRegion(BUSAN, SEOUL)).toBe(true);
  });
  it('Сан-Паулу — НЕ в регионе (левая точка геокодера)', () => {
    expect(inRegion(SAO_PAULO, SEOUL)).toBe(false);
  });
  it('центр неизвестен → считаем, что да (без регресса)', () => {
    expect(inRegion(SAO_PAULO, null)).toBe(true);
  });
  it('нет координат → нет', () => {
    expect(inRegion(null, SEOUL)).toBe(false);
  });
  it('радиус региона разумный (вся Корея, но не соседние континенты)', () => {
    expect(REGION_RADIUS_KM).toBeGreaterThanOrEqual(500);
    expect(REGION_RADIUS_KM).toBeLessThan(2000);
  });
});

describe('toCoords', () => {
  it('пара чисел → координаты, иначе null', () => {
    expect(toCoords([1, 2])).toEqual([1, 2]);
    expect(toCoords(['a', 2])).toBeNull();
    expect(toCoords(null)).toBeNull();
    expect(toCoords([1])).toBeNull();
  });
});
