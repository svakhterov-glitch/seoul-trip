'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

export type SessionState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; session: Session; email: string };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      setState(s ? { status: 'authed', session: s, email: s.user.email ?? '' } : { status: 'anon' });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setState(s ? { status: 'authed', session: s, email: s.user.email ?? '' } : { status: 'anon' });
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
