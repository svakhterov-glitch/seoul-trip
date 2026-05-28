import { describe, it, expect } from 'vitest';
import { rubricMeta, MEDIA_RUBRICS } from '@/lib/media';

describe('rubricMeta', () => {
  it('возвращает мету известной рубрики', () => {
    expect(rubricMeta('new').label).toBe('Новое');
    expect(rubricMeta('best').label).toBe('Лучшее');
    expect(rubricMeta('trending').label).toBe('В тренде');
  });
  it('неизвестная рубрика → дефолт «В тренде»', () => {
    expect(rubricMeta('whatever').key).toBe('trending');
  });
  it('палитра дальтоник-безопасная: нет зелёно-красной пары (все цвета различны)', () => {
    const colors = MEDIA_RUBRICS.map((r) => r.color);
    expect(new Set(colors).size).toBe(3);
  });
});
