export const dynamic = "force-dynamic";

import Link from "next/link";
import { listCustomerInsights, listCustomers, listSegments, listAISuggestions, getTenant } from "@/lib/db";
import { CreateCampaignButton } from "./CreateCampaignButton";

const riskStyles: Record<string, string> = {
  low: "bg-polish/15 text-polish",
  medium: "bg-yellow-500/15 text-yellow-400",
  high: "bg-red-500/15 text-red-400",
};

export default async function InsightsPage() {
  const [insights, customers, segments, suggestions, tenant] = await Promise.all([
    listCustomerInsights(),
    listCustomers(),
    listSegments(),
    listAISuggestions(),
    getTenant(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <main className="min-h-screen px-8 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">{tenant.name}</p>
        <h1 className="text-2xl font-semibold mt-1">Customer Intelligence</h1>
      </header>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">AI suggestions</h2>
        {suggestions.length === 0 ? (
          <p className="text-fog text-sm">No suggestions right now — segments are all healthy.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-card border border-steel bg-graphite p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.headline}</p>
                  <p className="text-fog text-xs mt-1">{s.recommended_action}</p>
                </div>
                <CreateCampaignButton suggestionId={s.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Segments</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {segments.map((s) => (
            <div key={s.id} className="rounded-card border border-steel bg-graphite p-4">
              <p className="text-fog text-xs uppercase tracking-wide">{s.name}</p>
              <p className="text-2xl font-display font-bold mt-1">{s.customer_ids.length}</p>
              <p className="text-fog text-xs mt-1">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Per-customer</h2>
        <div className="rounded-card border border-steel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-graphite text-fog text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Lifetime Value</th>
                <th className="px-4 py-3 font-medium">Churn Risk</th>
                <th className="px-4 py-3 font-medium">Avg. days between visits</th>
                <th className="px-4 py-3 font-medium">Predicted next visit</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((i) => {
                const c = customerById.get(i.customer_id);
                return (
                  <tr key={i.customer_id} className="border-t border-steel/60">
                    <td className="px-4 py-3">{c ? `${c.name} ${c.surname}` : i.customer_id}</td>
                    <td className="px-4 py-3">€{i.lifetime_value}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${riskStyles[i.churn_risk]}`}>{i.churn_risk}</span>
                    </td>
                    <td className="px-4 py-3 text-fog">{i.avg_days_between_visits ?? "—"}</td>
                    <td className="px-4 py-3 text-fog">
                      {i.predicted_next_visit_days === null ? "—" : `in ${i.predicted_next_visit_days}d`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
