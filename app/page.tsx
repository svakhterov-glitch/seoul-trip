'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Hero } from '@/components/landing/Hero';
import { Steps } from '@/components/landing/Steps';
import { AuthCard, type AuthMode } from '@/components/landing/AuthCard';
import { getSupabase } from '@/lib/supabase/client';
import { signUp, signIn } from '@/lib/auth';
import { mapAuthError } from '@/lib/authErrors';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAuth(m: AuthMode, email: string, password: string) {
    setBusy(true);
    setServerError('');
    try {
      const supabase = getSupabase();
      if (m === 'signup') await signUp(supabase, email, password);
      else await signIn(supabase, email, password);
      router.replace('/app');
    } catch (e) {
      setServerError(mapAuthError(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <SiteHeader onLoginClick={() => setMode('signin')} />
      <Hero>
        <AuthCard
          key={mode}
          initialMode={mode}
          onSubmit={handleAuth}
          serverError={serverError}
          busy={busy}
        />
      </Hero>
      <Steps />
    </main>
  );
}
