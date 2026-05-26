import { describe, it, expect } from 'vitest';
import { cleanCompanions } from '@/lib/tripMeta';

describe('cleanCompanions', () => {
  it('убирает пробелы и пустые', () => {
    expect(cleanCompanions(['  Аня ', '', '  '])).toEqual(['Аня']);
  });
  it('убирает дубликаты без учёта регистра, сохраняя порядок', () => {
    expect(cleanCompanions(['Аня', 'Миша', 'аня'])).toEqual(['Аня', 'Миша']);
  });
  it('пустой список → пустой', () => {
    expect(cleanCompanions([])).toEqual([]);
  });
});
