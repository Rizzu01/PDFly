'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage('');
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) setMessage(error.message);
    else setMessage('Account created. Check your email to verify your account.');
    setLoading(false);
  }

  async function handleGoogle() {
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="site-shell">
      <section className="container" style={{ maxWidth: 520, paddingTop: 96, paddingBottom: 96 }}>
        <Link href="/" className="ghost-button">← Back to PDFly</Link>
        <div className="card" style={{ marginTop: 28, padding: 32 }}>
          <p className="eyebrow">Get started</p><h1>Create your PDFly account</h1><p className="muted">Your PDFs stay private. Your account stores only profile and usage data.</p>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 28 }}>
            <input aria-label="Full name" type="text" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <input aria-label="Email" type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <input aria-label="Password" type="password" placeholder="Password (8+ characters)" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="dark-button" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
          <button className="ghost-button" onClick={handleGoogle} style={{ width: '100%', marginTop: 12 }}>Continue with Google</button>
          {message && <p role="status" style={{ marginTop: 16 }}>{message}</p>}
          <p className="muted" style={{ marginTop: 22 }}>Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </section>
    </main>
  );
}
