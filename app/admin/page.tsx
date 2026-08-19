export const dynamic = "force-dynamic";

import { getDashboardSummary, listCustomers, getTenant, listTiers, listCampaigns, getTokenUsageSummary } from "@/lib/db";
import { RunCampaignsButton } from "./RunCampaignsButton";
import Link from "next/link";

function StatCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-card border border-steel bg-graphite p-5">
      <p className="text-fog text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-display font-bold mt-2 ${accent ? "text-polish" : "text-chalk"}`}>{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const [summary, customers, tenant, tiers, campaigns, tokenUsage] = await Promise.all([
    getDashboardSummary(),
    listCustomers(),
    getTenant(),
    listTiers(),
    listCampaigns(),
    getTokenUsageSummary(),
  ]);

  return (
    <main className="min-h-screen px-8 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>
          <div className="flex items-center gap-2">
            <Link href="/superadmin" className="text-xs text-fog hover:text-chalk">Super Admin</Link>
            <Link href="/admin/insights" className="text-xs text-fog hover:text-chalk border border-steel rounded-full px-3 py-1.5">
              Insights
            </Link>
            <Link href="/admin/giftcards" className="text-xs text-fog hover:text-chalk border border-steel rounded-full px-3 py-1.5">
              Gift Cards
            </Link>
            <Link href="/admin/messages" className="text-xs text-fog hover:text-chalk border border-steel rounded-full px-3 py-1.5">
              Messages
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-fog text-xs uppercase tracking-[0.2em]">{tenant.name}</p>
          <span className="text-xs text-fog">
            {tokenUsage.plan} · {tokenUsage.used}/{tokenUsage.limit} tokens (30d)
          </span>
        </div>
        <h1 className="text-2xl font-semibold mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Today's revenue" value={`€${summary.todays_revenue}`} accent />
        <StatCard label="Today's visits" value={summary.todays_visits} />
        <StatCard label="Points issued (30d)" value={summary.points_issued_30d} />
        <StatCard label="Points redeemed (30d)" value={summary.points_redeemed_30d} />
        <StatCard label="New customers (30d)" value={summary.new_customers_30d} />
        <StatCard label="Returning customers" value={summary.returning_customers_30d} />
        <StatCard label="Active customers" value={summary.active_customers} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wide text-fog">Campaigns</h2>
          <RunCampaignsButton />
        </div>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-card border border-steel bg-graphite p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-fog text-xs mt-0.5">{c.action_config.message}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${c.active ? "bg-polish/15 text-polish" : "bg-steel text-fog"}`}>
                {c.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Customers</h2>
        <div className="rounded-card border border-steel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-graphite text-fog text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-steel/60">
                  <td className="px-4 py-3">{c.name} {c.surname}</td>
                  <td className="px-4 py-3 text-fog">{c.mobile}</td>
                  <td className="px-4 py-3 text-polish font-medium">{c.points_balance}</td>
                  <td className="px-4 py-3 text-fog">{tiers.find((t) => t.id === c.tier_id)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-fog">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
