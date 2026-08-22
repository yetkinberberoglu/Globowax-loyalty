import { redirect } from "next/navigation";
import { getAuthedStaff } from "@/lib/auth";
import { supabaseServerSSR } from "@/lib/supabase/server-ssr";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getAuthedStaff();
  if (!staff) {
    // Same orphaned-session issue as /club — a Supabase Auth session with
    // no matching app_users row would otherwise loop against middleware.ts.
    await supabaseServerSSR().auth.signOut();
    redirect("/admin/login");
  }
  return <>{children}</>;
}
