'use client';

import { useState } from 'react';
import { validateCredentials, type CredentialErrors } from '@/lib/validation';
import styles from './AuthCard.module.css';

export type AuthMode = 'signup' | 'signin';

interface Props {
  initialMode: AuthMode;
  onSubmit: (mode: AuthMode, email: string, password: string) => void;
  serverError: string;
  busy: boolean;
}

export function AuthCard({ initialMode, onSubmit, serverError, busy }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateCredentials(email, password);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(mode, email, password);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signup'}
          className={mode === 'signup' ? styles.tabOn : styles.tab}
          onClick={() => setMode('signup')}>Регистрация</button>
        <button type="button" role="tab" aria-selected={mode === 'signin'}
          className={mode === 'signin' ? styles.tabOn : styles.tab}
          onClick={() => setMode('signin')}>Вход</button>
      </div>

      <label className={styles.label} htmlFor="email">Email</label>
      <input id="email" type="email" className={styles.input} value={email}
        autoComplete="email" disabled={busy}
        onChange={(e) => setEmail(e.target.value)} />
      {errors.email && <div className={styles.err}>{errors.email}</div>}

      <label className={styles.label} htmlFor="password">Пароль</label>
      <input id="password" type="password" className={styles.input} value={password}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={busy}
        onChange={(e) => setPassword(e.target.value)} />
      {errors.password && <div className={styles.err}>{errors.password}</div>}

      {serverError && <div className={styles.serverErr}>{serverError}</div>}

      <button type="submit" className={styles.cta} disabled={busy}>
        {busy ? 'Подождите…' : mode === 'signup' ? 'Начать планировать' : 'Войти'}
      </button>

      <p className={styles.fine}>
        Бесплатно. Личный аккаунт — поездки видны только вам.
      </p>
    </form>
  );
}
