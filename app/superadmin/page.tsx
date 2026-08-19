export const dynamic = "force-dynamic";

import Link from "next/link";
import { listTenantsWithUsage } from "@/lib/db";

const planLabels: Record<string, string> = {
  starter: "Starter — €79/mo",
  scale: "Scale — €299/mo",
  pro: "Pro — Custom",
};

export default async function SuperAdminPage() {
  const rows = await listTenantsWithUsage();

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <header className="mb-8">
        <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">Platform Owner</p>
        <h1 className="text-2xl font-semibold mt-1">Super Admin</h1>
        <p className="text-fog text-sm mt-1">
          Every tenant on Globowax Club, across every car wash and detailing business using the platform.
        </p>
      </header>

      <div className="rounded-card border border-steel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-graphite text-fog text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Customers</th>
              <th className="px-4 py-3 font-medium">Token usage (30d)</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ tenant, billing, usage, customerCount }) => (
              <tr key={tenant.id} className="border-t border-steel/60">
                <td className="px-4 py-3 font-medium">{tenant.name}</td>
                <td className="px-4 py-3 text-fog">{planLabels[billing?.plan ?? "starter"]}</td>
                <td className="px-4 py-3">{customerCount}</td>
                <td className="px-4 py-3">
                  <span className={usage.used > usage.limit ? "text-red-400" : "text-polish"}>
                    {usage.used}
                  </span>
                  <span className="text-fog"> / {usage.limit}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-polish/15 text-polish">
                    {billing?.status ?? "active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-fog text-xs mt-4">
        Only Globowax Malta exists today — this view is built to scale as more car wash and detailing
        businesses onboard as separate tenants, each with their own customers, staff, and billing.
      </p>
    </main>
  );
}
