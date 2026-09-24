import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://xaaerrvvcfrwtggzwmjh.supabase.co';

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_nCXiLeksPC9xxVFls-54sQ_5b3TD7t3';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Cookie writes from Server Components are handled by proxy.ts.
          }
        },
      },
    },
  );
}
