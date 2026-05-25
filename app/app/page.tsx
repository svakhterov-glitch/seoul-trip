'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { listTrips, type TripSummary } from '@/lib/trips';
import { TripsHeader } from '@/components/trips/TripsHeader';
import { TripsGrid } from '@/components/trips/TripsGrid';
import styles from './page.module.css';

export default function TripsPage() {
  const router = useRouter();
  const session = useSession();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed') return;
    listTrips(getSupabase()).then((list) => {
      if (list.length === 0) router.replace('/app/new');
      else setTrips(list);
    });
  }, [session.status, router]);

  if (session.status !== 'authed' || trips === null) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  return (
    <main>
      <TripsHeader email={session.email} />
      <h1 className={styles.h1}>Мои поездки</h1>
      <TripsGrid
        trips={trips}
        onNew={() => router.push('/app/new')}
        onOpen={() => router.push('/app/new?soon=1')}
      />
    </main>
  );
}
