export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTransactionHistory, getTenant } from "@/lib/db";

export default async function HistoryPage() {
  const [days, tenant] = await Promise.all([getTransactionHistory(30), getTenant()]);

  return (
    <main className="min-h-screen px-8 py-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">{tenant.name}</p>
        <h1 className="text-2xl font-semibold mt-1">History</h1>
        <p className="text-fog text-sm mt-1">Past 30 days — today's dashboard numbers reset daily, but nothing is ever deleted.</p>
      </header>

      {days.length === 0 ? (
        <p className="text-fog text-sm">No transactions in the last 30 days.</p>
      ) : (
        <div className="space-y-6">
          {days.map((d) => (
            <section key={d.date} className="rounded-card border border-steel overflow-hidden">
              <div className="bg-graphite px-4 py-3 flex items-center justify-between">
                <span className="font-medium">
                  {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span className="text-sm text-fog">{d.visits} visit{d.visits === 1 ? "" : "s"} · <span className="text-polish font-semibold">€{d.revenue.toFixed(2)}</span></span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-fog text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Payment</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-steel/60">
                      <td className="px-4 py-2 text-fog">{new Date(t.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2">{t.customer_name}</td>
                      <td className="px-4 py-2 text-fog capitalize">{t.payment_method}</td>
                      <td className="px-4 py-2 text-right font-medium">€{t.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
