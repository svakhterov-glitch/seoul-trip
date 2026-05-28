import { describe, it, expect } from 'vitest';
import { demoMediaFor, SEOUL_MEDIA_DEMO } from '@/lib/mediaDemo';
import { MEDIA_RUBRICS } from '@/lib/media';
import { getPlaceKind } from '@/lib/entities';

const RUBRICS = MEDIA_RUBRICS.map((r) => r.key);

describe('demoMediaFor', () => {
  it('отдаёт фикстуру для Сеула (регистр, пробелы и хвост страны не важны)', () => {
    expect(demoMediaFor('Сеул')).toBe(SEOUL_MEDIA_DEMO);
    expect(demoMediaFor('  сеул ')).toBe(SEOUL_MEDIA_DEMO);
    expect(demoMediaFor('Seoul')).toBe(SEOUL_MEDIA_DEMO);
    expect(demoMediaFor('Сеул, Южная Корея')).toBe(SEOUL_MEDIA_DEMO);
  });

  it('для других городов и пустого ввода — null', () => {
    expect(demoMediaFor('Токио')).toBeNull();
    expect(demoMediaFor('')).toBeNull();
  });

  it('каждое место имеет живую ссылку на источник, валидную рубрику и сегмент', () => {
    expect(SEOUL_MEDIA_DEMO.length).toBeGreaterThanOrEqual(12);
    for (const item of SEOUL_MEDIA_DEMO) {
      expect(item.name).toBeTruthy();
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.source).toBeTruthy();
      expect(RUBRICS).toContain(item.rubric);
      expect(getPlaceKind(item.segment)).not.toBeNull();
      expect(item.coords).not.toBeNull();
    }
  });

  it('источники разнообразны (≥3 издания) и все рубрики представлены', () => {
    const sources = new Set(SEOUL_MEDIA_DEMO.map((i) => i.source));
    expect(sources.size).toBeGreaterThanOrEqual(3);
    const rubrics = new Set(SEOUL_MEDIA_DEMO.map((i) => i.rubric));
    for (const r of RUBRICS) expect(rubrics.has(r)).toBe(true);
  });
});
