import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side, cookie-aware client for reading the logged-in user's
// session inside Server Components and Route Handlers. Uses the
// publishable key + the user's own session — this is intentionally NOT
// the service-role client (lib/supabase/server.ts). This one only tells
// you WHO is logged in; lib/db.ts (service role) still does the actual
// data reads/writes once we know who's asking.
export function supabaseServerSSR() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware handles session refresh, so this is safe to ignore.
          }
        },
      },
    }
  );
}
