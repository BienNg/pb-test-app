import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  // Keep a stable browser client instance across renders to avoid
  // duplicate auth subscriptions and unexpected page state resets.
  if (browserClient !== undefined) return browserClient;
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
