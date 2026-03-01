import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server-only — uses service role key to bypass RLS (for webhooks / API routes)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
