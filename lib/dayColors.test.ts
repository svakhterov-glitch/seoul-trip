import { describe, it, expect } from 'vitest';
import { dayColor, DAY_PALETTE } from '@/lib/dayColors';

describe('dayColor', () => {
  it('день 1 — первый цвет палитры', () => {
    expect(dayColor(1)).toBe(DAY_PALETTE[0]);
  });
  it('цикл по длине палитры', () => {
    expect(dayColor(DAY_PALETTE.length + 1)).toBe(DAY_PALETTE[0]);
  });
  it('обзор (0) — тёмно-синий', () => {
    expect(dayColor(0)).toBe('#0f1b3d');
  });
});
