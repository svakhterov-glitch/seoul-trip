import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaceForm } from '@/components/planner/PlaceForm';

describe('PlaceForm', () => {
  it('показывает ошибки при пустой отправке', async () => {
    const onSubmit = vi.fn();
    render(<PlaceForm coords={null} onSubmit={onSubmit} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(screen.getByText('Введите название места')).toBeInTheDocument();
    expect(screen.getByText('Укажите точку на карте')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('отправляет данные при валидной форме', async () => {
    const onSubmit = vi.fn();
    render(<PlaceForm coords={[37.5, 127]} onSubmit={onSubmit} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    await userEvent.type(screen.getByLabelText('Название'), 'Кафе');
    await userEvent.type(screen.getByLabelText('Время'), '10:00');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Кафе', time: '10:00', coords: [37.5, 127] }));
  });

  it('кнопка указания точки вызывает onPickCoords', async () => {
    const onPickCoords = vi.fn();
    render(<PlaceForm coords={null} onSubmit={vi.fn()} onCancel={vi.fn()} onPickCoords={onPickCoords} busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Указать точку на карте/i }));
    expect(onPickCoords).toHaveBeenCalled();
  });

  it('предзаполняется из initial при редактировании', () => {
    render(<PlaceForm coords={[37.5, 127]} onSubmit={vi.fn()} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false}
      initial={{ name: 'Парк', coords: [37.5, 127], time: '12:00', desc: 'тихо', price: 'free', image: '', kind: 'nature', by: 'Аня', note: 'пикник' }} />);
    expect(screen.getByLabelText('Название')).toHaveValue('Парк');
    expect(screen.getByLabelText('Время')).toHaveValue('12:00');
    expect(screen.getByLabelText('Формат места')).toHaveValue('nature');
    expect(screen.getByLabelText(/Комментарий/i)).toHaveValue('пикник');
  });

  it('отправляет формат, человека и комментарий', async () => {
    const onSubmit = vi.fn();
    render(<PlaceForm coords={[37.5, 127]} companions={['Аня', 'Миша']} onSubmit={onSubmit} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    await userEvent.type(screen.getByLabelText('Название'), 'Музей');
    await userEvent.selectOptions(screen.getByLabelText('Формат места'), 'museum');
    await userEvent.selectOptions(screen.getByLabelText('Человек'), 'Миша');
    await userEvent.type(screen.getByLabelText(/Комментарий/i), 'не забыть');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Музей', kind: 'museum', by: 'Миша', note: 'не забыть' }));
  });

  it('поле «Человек» предлагает спутников поездки', () => {
    render(<PlaceForm coords={[37.5, 127]} companions={['Аня', 'Миша']} onSubmit={vi.fn()} onCancel={vi.fn()} onPickCoords={vi.fn()} busy={false} />);
    expect(screen.getByRole('option', { name: 'Аня' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Миша' })).toBeInTheDocument();
  });
});
