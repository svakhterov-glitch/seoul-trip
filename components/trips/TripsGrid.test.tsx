import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripsGrid } from '@/components/trips/TripsGrid';

const trips = [
  { id: 't1', title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' },
] as never[];

describe('TripsGrid', () => {
  it('рисует карточки поездок и кнопку новой', () => {
    render(<TripsGrid trips={trips} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Сеул')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Новая поездка/i })).toBeInTheDocument();
  });

  it('клик по карточке вызывает onOpen с id', async () => {
    const onOpen = vi.fn();
    render(<TripsGrid trips={trips} onNew={vi.fn()} onOpen={onOpen} />);
    screen.getByText('Сеул').click();
    expect(onOpen).toHaveBeenCalledWith('t1');
  });
});
