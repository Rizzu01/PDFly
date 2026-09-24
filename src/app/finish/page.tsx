'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function FinishSignInPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let redirected = false;

    const goToDashboard = () => {
      if (!active || redirected) return;
      redirected = true;
      router.replace('/dashboard');
    };

    const finish = async () => {
      // Google may return an implicit-flow session in the URL hash.
      // Handle that explicitly before falling back to the normal session/code flow.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          window.history.replaceState({}, document.title, '/finish');
          goToDashboard();
          return;
        }
      }

      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          goToDashboard();
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        goToDashboard();
        return;
      }

      // Give Supabase's browser auth listener a moment to finish processing
      // the OAuth callback before treating the flow as failed.
      window.setTimeout(async () => {
        if (!active || redirected) return;
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session) {
          goToDashboard();
        } else {
          router.replace('/login?error=auth_callback');
        }
      }, 1200);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        goToDashboard();
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
