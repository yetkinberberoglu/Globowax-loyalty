import { redirect } from "next/navigation";
import { getAuthedStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getAuthedStaff();
  if (!staff) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
