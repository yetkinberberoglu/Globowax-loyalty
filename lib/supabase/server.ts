import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only. Uses the service role key, so it bypasses RLS entirely —
// that's intentional until Supabase Auth is wired in and requests carry a
// per-customer/staff JWT. Never import this from a Client Component; it
// would leak the service role key to the browser. Every function in
// lib/db.ts calls this, and lib/db.ts is only ever imported from Server
// Components and API routes, which is what keeps this safe.

let client: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in your project's values from Supabase → Project Settings → API."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
