'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileDown, FileText, LogOut, Merge, ScanText, ShieldCheck, Split } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Profile = { full_name: string | null; email: string | null };
type Usage = { processing_jobs: number; usage_date: string };
type Subscription = { plan: 'free' | 'pro'; status: string; current_period_end: string | null };

const tools = [
  { href: '/', icon: Merge, title: 'Merge PDF', text: 'Combine multiple PDFs.' },
  { href: '/split', icon: Split, title: 'Split PDF', text: 'Extract selected pages.' },
  { href: '/organize', icon: FileText, title: 'Organize PDF', text: 'Reorder or remove pages.' },
  { href: '/compress', icon: FileDown, title: 'Compress PDF', text: 'Reduce file size.' },
  { href: '/ocr', icon: ScanText, title: 'OCR', text: 'Make scanned PDFs searchable.' },
];

const DAILY_LIMIT = 5;

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const [profileResult, usageResult, subscriptionResult] = await Promise.all([
        supabase.from('profiles').select('full_name,email').eq('id', user.id).single(),
        supabase.from('usage').select('processing_jobs,usage_date').eq('user_id', user.id).single(),
        supabase.from('subscriptions').select('plan,status,current_period_end').eq('user_id', user.id).single(),
      ]);

      if (profileResult.error || usageResult.error || subscriptionResult.error) {
        setError('We could not load your account details. Please refresh and try again.');
      }

      setProfile(profileResult.data ?? { full_name: user.user_metadata?.full_name ?? null, email: user.email ?? null });
      setUsage(usageResult.data ?? { processing_jobs: 0, usage_date: new Date().toISOString().slice(0, 10) });
      setSubscription(subscriptionResult.data ?? { plan: 'free', status: 'active', current_period_end: null });
      setLoading(false);
    }

    void loadDashboard();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return <main className="site-shell"><section className="container" style={{ paddingTop: 120 }}><p className="muted">Loading your PDFly workspace…</p></section></main>;
  }

  const used = usage?.processing_jobs ?? 0;
  const remaining = Math.max(DAILY_LIMIT - used, 0);
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'there';

  return (
    <main className="site-shell">
      <nav className="nav container">
        <Link className="brand" href="/" aria-label="PDFly home"><span className="brand-mark"><span /></span><span>PDFly</span></Link>
        <div className="nav-actions">
          <button className="ghost-button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
        </div>
      </nav>

      <section className="container" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <span className="kicker">Your workspace</span>
            <h1 style={{ marginTop: 10 }}>Good to see you, {displayName}.</h1>
            <p className="muted">{profile?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 999, background: 'white' }}>
            <ShieldCheck size={16} />
            <strong style={{ textTransform: 'capitalize' }}>{subscription?.plan ?? 'free'} plan</strong>
          </div>
        </div>

        {error && <p role="alert" className="error-message" style={{ marginTop: 24 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 36 }}>
          <div className="card" style={{ padding: 24 }}><span className="kicker">Daily usage</span><h2 style={{ margin: '10px 0 4px' }}>{used} / {DAILY_LIMIT}</h2><p className="muted">processing jobs used today</p></div>
          <div className="card" style={{ padding: 24 }}><span className="kicker">Remaining</span><h2 style={{ margin: '10px 0 4px' }}>{remaining}</h2><p className="muted">browser-first jobs available</p></div>
          <div className="card" style={{ padding: 24 }}><span className="kicker">Privacy</span><h2 style={{ margin: '10px 0 4px' }}>Private</h2><p className="muted">PDFs are not stored permanently by default.</p></div>
        </div>

        <div style={{ marginTop: 56 }}>
          <div className="section-heading"><div><span className="kicker">PDF tools</span><h2>Pick up where you left off.</h2></div></div>
          <div className="tool-grid">
            {tools.map(({ href, icon: Icon, title, text }) => (
              <Link className="tool-card" href={href} key={title}>
                <span className="tool-icon"><Icon size={20} /></span>
                <span><strong>{title}</strong><small>{text}</small></span>
                <ArrowRight className="tool-arrow" size={17} />
              </Link>
            ))}
          </div>
        </div>

        <div className="security-card" style={{ marginTop: 48 }}>
          <div className="security-icon"><ShieldCheck size={24} /></div>
          <div><span className="kicker">Account</span><h2>PDFly keeps the workflow simple.</h2><p>Use browser-side tools whenever possible. Heavy processing can be handled temporarily by the processing API without creating permanent PDF storage.</p></div>
        </div>
      </section>
    </main>
  );
}
