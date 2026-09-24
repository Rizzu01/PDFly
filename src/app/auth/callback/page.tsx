'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing your sign-in…');

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const code = searchParams.get('code');
      if (!code) {
        router.replace('/login?error=auth_callback');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;

      if (error) {
        setMessage('We could not complete sign-in. Please try again.');
        window.setTimeout(() => router.replace('/login?error=auth_callback'), 900);
        return;
      }

      router.replace('/dashboard');
    }

    void finishAuth();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main className="site-shell">
      <section className="container" style={{ maxWidth: 520, paddingTop: 140, paddingBottom: 140, textAlign: 'center' }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <span className="brand-mark"><span /></span>
          <span>PDFly</span>
        </div>
        <h1 style={{ marginTop: 28 }}>One moment.</h1>
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="site-shell">
        <section className="container" style={{ maxWidth: 520, paddingTop: 140, paddingBottom: 140, textAlign: 'center' }}>
          <div className="brand" style={{ justifyContent: 'center' }}>
            <span className="brand-mark"><span /></span>
            <span>PDFly</span>
          </div>
          <h1 style={{ marginTop: 28 }}>One moment.</h1>
          <p className="muted">Completing your sign-in…</p>
        </section>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
