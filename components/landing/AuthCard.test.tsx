import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthCard } from '@/components/landing/AuthCard';

describe('AuthCard', () => {
  it('показывает ошибки валидации при пустой отправке', async () => {
    const onSubmit = vi.fn();
    render(<AuthCard initialMode="signup" onSubmit={onSubmit} serverError="" busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Начать планировать/i }));
    expect(screen.getByText('Введите email')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('вызывает onSubmit с данными при валидной отправке', async () => {
    const onSubmit = vi.fn();
    render(<AuthCard initialMode="signin" onSubmit={onSubmit} serverError="" busy={false} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.ru');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: /^Войти$/i }));
    expect(onSubmit).toHaveBeenCalledWith('signin', 'a@b.ru', 'secret1');
  });

  it('показывает серверную ошибку', () => {
    render(<AuthCard initialMode="signin" onSubmit={vi.fn()} serverError="Неверный email или пароль" busy={false} />);
    expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument();
  });
});
