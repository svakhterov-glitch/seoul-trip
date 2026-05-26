import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripCover } from '@/components/planner/TripCover';

const base = {
  city: 'Сеул',
  title: 'Весна в Сеуле',
  lead: 'Поездка мечты',
  companions: ['Аня'],
  dateRange: '7–15 июня 2026',
  busy: false,
};

describe('TripCover', () => {
  it('показывает город заглавными, название, описание и спутника', () => {
    render(<TripCover {...base} onSave={vi.fn()} />);
    expect(screen.getByText('СЕУЛ')).toBeInTheDocument();
    expect(screen.getByText('Весна в Сеуле')).toBeInTheDocument();
    expect(screen.getByText('Поездка мечты')).toBeInTheDocument();
    expect(screen.getByText('Аня')).toBeInTheDocument();
  });

  it('кнопка «Редактировать» открывает форму с предзаполнением', async () => {
    render(<TripCover {...base} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Редактировать обложку/i }));
    expect(screen.getByLabelText('Название поездки')).toHaveValue('Весна в Сеуле');
    expect(screen.getByLabelText('Описание')).toHaveValue('Поездка мечты');
  });

  it('сохраняет изменения с добавленным спутником (очищенным)', async () => {
    const onSave = vi.fn();
    render(<TripCover {...base} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /Редактировать обложку/i }));

    const title = screen.getByLabelText('Название поездки');
    await userEvent.clear(title);
    await userEvent.type(title, 'Новый заголовок');

    await userEvent.type(screen.getByLabelText('Добавить спутника'), '  Миша  ');
    await userEvent.click(screen.getByRole('button', { name: /^Добавить$/i }));

    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Новый заголовок',
      lead: 'Поездка мечты',
      companions: ['Аня', 'Миша'],
    });
  });

  it('пустое название не сохраняется', async () => {
    const onSave = vi.fn();
    render(<TripCover {...base} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /Редактировать обложку/i }));
    await userEvent.clear(screen.getByLabelText('Название поездки'));
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Введите название поездки')).toBeInTheDocument();
  });

  it('удаление спутника в форме', async () => {
    const onSave = vi.fn();
    render(<TripCover {...base} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /Редактировать обложку/i }));
    await userEvent.click(screen.getByRole('button', { name: /Удалить спутника Аня/i }));
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ companions: [] }));
  });
});
