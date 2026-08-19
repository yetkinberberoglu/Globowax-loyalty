import { supabaseServerSSR } from "./supabase/server-ssr";
import { supabaseServer } from "./supabase/server";
import type { Customer, AppUser } from "./types";

/**
 * Resolves the currently logged-in browser session (if any) to a
 * customers row, via customers.auth_user_id. Returns null if nobody is
 * logged in, or if the logged-in auth user hasn't been linked to a
 * customer row yet (shouldn't happen for anyone who went through
 * /signup — see app/api/auth/complete-customer-signup).
 */
export async function getAuthedCustomer(): Promise<Customer | null> {
  const ssr = supabaseServerSSR();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseServer()
    .from("customers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Customer;
}

/**
 * Resolves the currently logged-in browser session to a staff/admin row
 * via app_users.auth_user_id. Returns null if nobody is logged in or the
 * account has no staff record (e.g. a customer account trying /admin).
 */
export async function getAuthedStaff(): Promise<AppUser | null> {
  const ssr = supabaseServerSSR();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseServer()
    .from("app_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}
