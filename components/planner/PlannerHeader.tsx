'use client';

import Link from 'next/link';
import { formatDateRange } from '@/lib/days';
import styles from './PlannerHeader.module.css';

export function PlannerHeader({ title, startDate, endDate }: { title: string; startDate: string; endDate: string }) {
  return (
    <header className={styles.bar}>
      <Link href="/app" className={styles.back}>← Мои поездки</Link>
      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
        <div className={styles.dates}>{formatDateRange(startDate, endDate)}</div>
      </div>
      <div className={styles.spacer} />
    </header>
  );
}
