export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTransactionHistory, getTransactionsForDate, getTenant } from "@/lib/db";

function DayCard({ d }: { d: { date: string; revenue: number; visits: number; transactions: any[] } }) {
  return (
    <section className="rounded-card border border-steel overflow-hidden">
      <div className="bg-graphite px-4 py-3 flex items-center justify-between">
        <span className="font-medium">
          {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
        <span className="text-sm text-fog">
          {d.visits} visit{d.visits === 1 ? "" : "s"} · <span className="text-polish font-semibold">€{d.revenue.toFixed(2)}</span>
        </span>
      </div>
      {d.transactions.length === 0 ? (
        <p className="text-fog text-sm px-4 py-4">No transactions this day.</p>
      ) : (
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
      )}
    </section>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const [tenant, selectedDay, days] = await Promise.all([
    getTenant(),
    date ? getTransactionsForDate(date) : Promise.resolve(null),
    date ? Promise.resolve(null) : getTransactionHistory(30),
  ]);

  return (
    <main className="min-h-screen px-8 py-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">{tenant.name}</p>
        <h1 className="text-2xl font-semibold mt-1">History</h1>
        <p className="text-fog text-sm mt-1">Today's dashboard numbers reset daily, but nothing is ever deleted — look back at any day here.</p>

        <form className="flex items-end gap-3 mt-5" action="/admin/history">
          <div>
            <label className="text-xs text-fog uppercase tracking-wide block mb-1">Jump to a day</label>
            <input
              type="date"
              name="date"
              defaultValue={date ?? ""}
              className="bg-graphite border border-steel rounded-lg px-3 py-2 text-sm text-chalk"
            />
          </div>
          <button type="submit" className="text-xs px-4 py-2 rounded-full bg-polish text-ink font-medium">Go</button>
          {date && (
            <Link href="/admin/history" className="text-xs text-fog hover:text-chalk px-2 py-2">
              ← Last 30 days
            </Link>
          )}
        </form>
      </header>

      {selectedDay ? (
        <DayCard d={selectedDay} />
      ) : days && days.length === 0 ? (
        <p className="text-fog text-sm">No transactions in the last 30 days.</p>
      ) : (
        <div className="space-y-6">
          {(days ?? []).map((d) => (
            <DayCard key={d.date} d={d} />
          ))}
        </div>
      )}
    </main>
  );
}
