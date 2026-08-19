import { createBrowserClient } from "@supabase/ssr";

// Browser-only. Uses the publishable key (safe to expose — it's gated by
// Row Level Security on the client's own auth session). Used for login,
// signup, and session refresh in the browser. Never use this for the
// service-role data access lib/db.ts relies on — that stays server-only.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
