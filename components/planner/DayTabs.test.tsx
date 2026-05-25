import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayTabs } from '@/components/planner/DayTabs';
import type { Day } from '@/lib/entities';

const days: Day[] = [
  { number: 1, date: '7 июня', cat: 'start', title: 'Прилёт', sub: '' },
  { number: 2, date: '8 июня', cat: null, title: 'День 2', sub: '' },
];

describe('DayTabs', () => {
  it('рисует «Весь маршрут» и дни', () => {
    render(<DayTabs days={days} categories={[]} activeDay={0} onSelect={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Весь маршрут/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /День 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /День 2/i })).toBeInTheDocument();
  });

  it('клик по дню вызывает onSelect с номером', async () => {
    const onSelect = vi.fn();
    render(<DayTabs days={days} categories={[]} activeDay={0} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('tab', { name: /День 2/i }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
