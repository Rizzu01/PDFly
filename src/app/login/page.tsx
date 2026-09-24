'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="site-shell">
      <section className="container" style={{ maxWidth: 520, paddingTop: 96, paddingBottom: 96 }}>
        <Link href="/" className="ghost-button">← Back to PDFly</Link>
        <div className="card" style={{ marginTop: 28, padding: 32 }}>
          <p className="eyebrow">Welcome back</p>
          <h1>Log in to PDFly</h1>
          <p className="muted">Access your account, usage and PDF workspace.</p>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 28 }}>
            <input aria-label="Email" type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <input aria-label="Password" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="dark-button" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
          </form>
          <button className="ghost-button" onClick={handleGoogle} style={{ width: '100%', marginTop: 12 }}>Continue with Google</button>
          {message && <p role="alert" style={{ marginTop: 16 }}>{message}</p>}
          <p className="muted" style={{ marginTop: 22 }}>New to PDFly? <Link href="/signup">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
