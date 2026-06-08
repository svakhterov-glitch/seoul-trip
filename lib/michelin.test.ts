import { describe, it, expect } from 'vitest';
import { distinctionMeta, starCount, distinctionRank, priceBand, MICHELIN_DISTINCTIONS } from './michelin';

describe('michelin model', () => {
  it('distinctionMeta находит мету по ключу, иначе Selected', () => {
    expect(distinctionMeta('star3').short).toBe('★★★');
    expect(distinctionMeta('bib').label).toBe('Bib Gourmand');
    expect(distinctionMeta('что-то').key).toBe('plate'); // фолбэк
  });

  it('starCount = число звёзд (0 для Bib/Selected)', () => {
    expect(starCount('star3')).toBe(3);
    expect(starCount('star2')).toBe(2);
    expect(starCount('star1')).toBe(1);
    expect(starCount('bib')).toBe(0);
    expect(starCount('plate')).toBe(0);
  });

  it('distinctionRank сортирует звёзды → Bib → Selected', () => {
    const sorted = [...MICHELIN_DISTINCTIONS].sort((a, b) => distinctionRank(a.key) - distinctionRank(b.key));
    expect(sorted.map((d) => d.key)).toEqual(['star3', 'star2', 'star1', 'bib', 'plate']);
  });

  it('priceBand: звёзды дороже, Bib бюджетнее', () => {
    expect(priceBand('star3')).toBe('₩₩₩₩');
    expect(priceBand('star2')).toBe('₩₩₩₩');
    expect(priceBand('star1')).toBe('₩₩₩');
    expect(priceBand('plate')).toBe('₩₩');
    expect(priceBand('bib')).toBe('₩');
  });
});
