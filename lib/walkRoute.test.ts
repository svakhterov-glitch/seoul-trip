import { describe, it, expect } from 'vitest';
import { isWalkable, legKey, buildLegs, WALK_MAX_KM } from '@/lib/walkRoute';
import type { Coords } from '@/lib/entities';

const bukchon: Coords = [37.5818, 126.9848];
const samcheong: Coords = [37.5836, 126.9817]; // ~0.3 км от Букчона
const leeum: Coords = [37.5383, 126.9991];      // ~5 км от Букчона (это уже метро)

describe('walkRoute', () => {
  it('короткий перегон — пешком', () => {
    expect(isWalkable(bukchon, samcheong)).toBe(true);
  });

  it('длинный перегон — поездка (не пешком)', () => {
    expect(isWalkable(bukchon, leeum)).toBe(false);
  });

  it('порог настраивается', () => {
    expect(isWalkable(bukchon, leeum, 10)).toBe(true);
    expect(isWalkable(bukchon, samcheong, 0.1)).toBe(false);
  });

  it('legKey стабилен и зависит от направления', () => {
    expect(legKey(bukchon, samcheong)).toBe(legKey(bukchon, samcheong));
    expect(legKey(bukchon, samcheong)).not.toBe(legKey(samcheong, bukchon));
  });

  it('buildLegs строит перегоны и помечает пешие/поездки', () => {
    const legs = buildLegs([bukchon, samcheong, leeum]);
    expect(legs.length).toBe(2);
    expect(legs[0].walk).toBe(true);   // Букчон → Самчхондон (рядом)
    expect(legs[1].walk).toBe(false);  // Самчхондон → Leeum (далеко, метро)
    expect(legs[0].from).toEqual(bukchon);
    expect(legs[1].to).toEqual(leeum);
  });

  it('одна точка или пусто — нет перегонов', () => {
    expect(buildLegs([bukchon])).toEqual([]);
    expect(buildLegs([])).toEqual([]);
  });

  it('WALK_MAX_KM в разумных пределах', () => {
    expect(WALK_MAX_KM).toBeGreaterThan(0.5);
    expect(WALK_MAX_KM).toBeLessThan(5);
  });
});
