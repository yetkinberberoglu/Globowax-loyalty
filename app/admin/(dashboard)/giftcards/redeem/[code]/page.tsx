export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getGiftCardByCode, getTenant } from "@/lib/db";
import { RedeemForm } from "./RedeemForm";

export default async function RedeemGiftCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [card, tenant] = await Promise.all([getGiftCardByCode(code), getTenant()]);
  if (!card) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/giftcards" className="text-xs text-fog hover:text-chalk">← Gift Cards</Link>
        </div>
        <p className="text-polish text-xs uppercase tracking-[0.2em] text-center">{tenant.name}</p>
        <h1 className="text-2xl font-semibold text-center mt-1 mb-8">Redeem Gift Card</h1>

        <div className="rounded-card border border-steel bg-graphite p-6 mb-6">
          <p className="font-mono text-polish text-xl font-bold text-center tracking-wider">{card.code}</p>
          {card.purchaser_name && card.purchaser_name !== "Walk-in" && (
            <p className="text-fog text-xs text-center mt-1">A gift from {card.purchaser_name}</p>
          )}
          <div className="flex justify-center gap-8 mt-4 text-center">
            <div>
              <p className="text-fog text-[10px] uppercase tracking-wide">Initial</p>
              <p className="text-lg font-semibold">€{card.initial_value}</p>
            </div>
            <div>
              <p className="text-fog text-[10px] uppercase tracking-wide">Balance</p>
              <p className="text-lg font-semibold text-polish">€{card.balance}</p>
            </div>
          </div>
        </div>

        {Number(card.balance) <= 0 ? (
          <p className="text-fog text-sm text-center">This gift card has already been fully redeemed.</p>
        ) : (
          <RedeemForm code={card.code} balance={Number(card.balance)} />
        )}
      </div>
    </main>
  );
}
