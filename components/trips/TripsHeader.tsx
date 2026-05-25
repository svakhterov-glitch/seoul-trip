'use client';

import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import styles from './TripsHeader.module.css';

export function TripsHeader({ email }: { email: string }) {
  const router = useRouter();
  async function handleLogout() {
    await signOut(getSupabase());
    router.replace('/');
  }
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>Trips<b>Plan</b></div>
      <div className={styles.right}>
        <span className={styles.email}>{email}</span>
        <button type="button" className={styles.logout} onClick={handleLogout}>Выйти</button>
      </div>
    </header>
  );
}
