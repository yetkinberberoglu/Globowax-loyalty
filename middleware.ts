import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin") || path.startsWith("/superadmin");
  const isClubPath = path.startsWith("/club");
  const isAdminLogin = path === "/admin/login";
  const isCustomerAuthPath = path === "/login" || path === "/signup";

  // Not logged in at all: bounce away from anything gated.
  if (!user) {
    if (isAdminPath && !isAdminLogin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isClubPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Logged in: keep them off the login/signup screens, and let the pages
  // themselves (via lib/auth.ts) decide staff-vs-customer role — the
  // middleware's job here is just "is there a session at all."
  if (user && (isCustomerAuthPath || isAdminLogin)) {
    return NextResponse.redirect(new URL(isAdminLogin ? "/admin" : "/club", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/superadmin/:path*", "/club/:path*", "/login", "/signup"],
};
