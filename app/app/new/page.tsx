'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { createTrip } from '@/lib/trips';
import { createTripDoc } from '@/lib/entities';
import { NewTripForm } from '@/components/trips/NewTripForm';
import { TripsHeader } from '@/components/trips/TripsHeader';
import type { NewTripInput } from '@/lib/validation';

export default function NewTripPage() {
  const router = useRouter();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (session.status === 'anon') router.replace('/');
  }, [session.status, router]);

  async function handleCreate(input: NewTripInput) {
    setBusy(true);
    setServerError('');
    try {
      const doc = createTripDoc(input);
      await createTrip(getSupabase(), doc);
      router.replace('/app');
    } catch {
      setServerError('Не удалось сохранить поездку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  if (session.status !== 'authed') return null;

  return (
    <main>
      <TripsHeader email={session.email} />
      <NewTripForm onCreate={handleCreate} busy={busy} serverError={serverError} />
    </main>
  );
}
