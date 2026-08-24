export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAllGiftCards, listGiftCardDenominations, listCustomers, getTenant } from "@/lib/db";
import { SellGiftCardForm } from "./SellGiftCardForm";

export default async function GiftCardsPage() {
  const [cards, denominations, customers, tenant] = await Promise.all([
    listAllGiftCards(),
    listGiftCardDenominations(),
    listCustomers(),
    getTenant(),
  ]);

  return (
    <main className="min-h-screen px-8 py-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">{tenant.name}</p>
        <h1 className="text-2xl font-semibold mt-1">Gift Cards</h1>
        <p className="text-fog text-sm mt-1">Sold in-store only — cash or card at the counter, no online checkout.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Sell a gift card</h2>
        <SellGiftCardForm denominations={denominations} customers={customers} />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">All gift cards</h2>
        {cards.length === 0 ? (
          <p className="text-fog text-sm">No gift cards sold yet.</p>
        ) : (
          <div className="rounded-card border border-steel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-graphite text-fog text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Initial</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Purchaser</th>
                  <th className="px-4 py-3 font-medium">Sold</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id} className="border-t border-steel/60">
                    <td className="px-4 py-3 font-mono text-polish">{c.code}</td>
                    <td className="px-4 py-3 text-fog">€{c.initial_value}</td>
                    <td className="px-4 py-3 font-medium">€{c.balance}</td>
                    <td className="px-4 py-3 text-fog">{c.purchaser_name}</td>
                    <td className="px-4 py-3 text-fog">{new Date(c.sold_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/giftcards/print/${c.code}`} target="_blank" className="text-polish text-xs hover:underline">
                        Print →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
