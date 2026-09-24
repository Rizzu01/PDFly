'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else window.location.href = '/dashboard';
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback-client` },
    });

    if (error) {
      setGoogleLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: '#f6f7f3' }}>
      <section style={{ background: '#151712', color: '#fff', padding: '48px 7vw', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100vh' }}>
        <Link href="/" className="brand" style={{ color: '#fff', width: 'fit-content' }}>
          <span className="brand-mark"><span /></span>
          <span>PDFly</span>
        </Link>

        <div style={{ maxWidth: 560 }}>
          <p style={{ color: '#d8ff5f', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>Your PDF workspace</p>
          <h1 style={{ fontSize: 'clamp(42px, 5vw, 72px)', lineHeight: 0.98, letterSpacing: '-.05em', margin: '18px 0' }}>PDFs, without the busywork.</h1>
          <p style={{ color: '#aeb1a9', fontSize: 18, lineHeight: 1.65, maxWidth: 480 }}>Merge, split, compress, convert, edit and OCR your documents from one clean workspace.</p>
        </div>

        <div style={{ display: 'flex', gap: 24, color: '#8f928a', fontSize: 13 }}>
          <span>Private by design</span><span>•</span><span>Browser-first processing</span>
        </div>
      </section>

      <section style={{ display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 430 }}>
          <Link href="/" className="muted" style={{ display: 'inline-flex', marginBottom: 38, textDecoration: 'none' }}>← Back to PDFly</Link>

          <div style={{ background: '#fff', border: '1px solid #e5e7e0', borderRadius: 28, padding: '38px 34px', boxShadow: '0 24px 70px rgba(17,18,15,.08)' }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Welcome back</p>
            <h2 style={{ fontSize: 34, letterSpacing: '-.04em', margin: 0 }}>Log in to PDFly</h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>Continue to your files, tools and account.</p>

            <button type="button" onClick={handleGoogle} disabled={googleLoading} className="ghost-button" style={{ width: '100%', height: 50, marginTop: 26, borderRadius: 12, fontWeight: 700 }}>
              <span style={{ fontSize: 18, marginRight: 10 }}>G</span>{googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: '#9b9e97', fontSize: 12 }}>
              <span style={{ height: 1, background: '#e7e8e3', flex: 1 }} />OR CONTINUE WITH EMAIL<span style={{ height: 1, background: '#e7e8e3', flex: 1 }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 13 }}>
              <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 700 }}>Email<input aria-label="Email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 50, borderRadius: 11 }} /></label>
              <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 700 }}>Password<input aria-label="Password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ height: 50, borderRadius: 11 }} /></label>
              <button className="dark-button" disabled={loading} style={{ width: '100%', height: 50, borderRadius: 11, marginTop: 5 }}>{loading ? 'Logging in…' : 'Log in'}</button>
            </form>

            {message && <p role="alert" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: '#fff5f2', color: '#a33a24', fontSize: 13, lineHeight: 1.5 }}>{message}</p>}
            <p className="muted" style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>New to PDFly? <Link href="/signup" style={{ fontWeight: 700 }}>Create an account</Link></p>
          </div>

          <p style={{ textAlign: 'center', color: '#8b8e87', fontSize: 12, marginTop: 22 }}>By continuing, you agree to PDFly's Terms and Privacy Policy.</p>
        </div>
      </section>

      <style jsx>{`@media (max-width: 820px) { main { grid-template-columns: 1fr !important; } main > section:first-child { display: none !important; } main > section:last-child { min-height: 100vh; } }`}</style>
    </main>
  );
}
