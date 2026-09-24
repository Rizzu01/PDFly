'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function FinishSignInPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        router.replace('/dashboard');
        return;
      }

      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace('/dashboard');
          return;
        }
      }

      router.replace('/login?error=auth_callback');
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        router.replace('/dashboard');
      }
    });

    void finish();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><p>Signing you in…</p></main>;
}
