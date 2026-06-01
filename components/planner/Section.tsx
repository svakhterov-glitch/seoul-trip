'use client';

import { type ReactNode } from 'react';
import styles from './Section.module.css';

interface Props {
  title: string;
  sub?: string;
  /** Бейдж справа от заголовка (напр. число новых предложений). */
  badge?: number;
  open: boolean;
  onToggle: () => void;
  /** Акцентная рамка (как у «Медиа»/«Предложки»). */
  accent?: boolean;
  children: ReactNode;
}

/** Сворачивающийся блок-карточка (общий вид с «Места и ссылки» / «Собрать маршрут»). */
export function Section({ title, sub, badge, open, onToggle, accent = false, children }: Props) {
  return (
    <section className={`${styles.wrap} ${accent ? styles.accent : ''}`}>
      <button type="button" className={styles.head} onClick={onToggle} aria-expanded={open}>
        <span className={styles.title}>
          {title}
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </span>
        {sub && <span className={styles.sub}>{sub}</span>}
        <span className={styles.chev} aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </section>
  );
}
