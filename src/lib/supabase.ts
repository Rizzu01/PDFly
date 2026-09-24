import { createClient } from '@supabase/supabase-js';

// Supabase's frontend URL and publishable key are intentionally safe to expose
// in browser code. Environment variables are preferred when available, while
// these public fallbacks keep the free Vercel deployment buildable without
// requiring Vercel Environment Variables.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://bcnbpbvezwkdpwrmaraq.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_FQ3x8D6SlvNGYQ-EZSXbMQ_5VOUjFUK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
