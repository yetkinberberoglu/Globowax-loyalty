export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getGiftCardByCode, getTenant } from "@/lib/db";
import { generateQRDataUrl } from "@/lib/qr";
import { PrintButton } from "./PrintButton";

export default async function PrintGiftCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [card, tenant] = await Promise.all([getGiftCardByCode(code), getTenant()]);
  if (!card) notFound();

  const redeemUrl = `https://loyalty.globowaxmalta.com/admin/giftcards/redeem/${card.code}`;
  const qr = await generateQRDataUrl(redeemUrl);

  return (
    <main className="min-h-screen bg-ink flex flex-col items-center py-10 px-5 print:bg-white print:py-0">
      <div className="print:hidden mb-6">
        <PrintButton />
      </div>

      {/* The card itself — sized to sit nicely on an A6/half-A5 print */}
      <div
        className="relative w-[500px] max-w-full rounded-[28px] overflow-hidden shadow-2xl print:shadow-none"
        style={{
          background: "linear-gradient(135deg, #0B0C0C 0%, #17191A 55%, #0B0C0C 100%)",
          border: "1px solid #2A2D2E",
        }}
      >
        {/* Decorative accent sweep */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #2FBF71 0%, transparent 70%)" }}
        />

        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-polish text-xs uppercase tracking-[0.25em] font-semibold">{tenant.name}</p>
              <p className="text-chalk text-2xl font-bold mt-1">Gift Card</p>
            </div>
            <div className="text-right">
              <p className="text-fog text-[10px] uppercase tracking-wide">Value</p>
              <p className="text-polish text-4xl font-extrabold leading-none">€{card.initial_value}</p>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-6">
            <div className="flex-1">
              <p className="text-fog text-[10px] uppercase tracking-wide mb-1">Code</p>
              <p className="font-mono text-chalk text-2xl font-bold tracking-wider bg-graphite border border-steel rounded-lg px-4 py-3 inline-block">
                {card.code}
              </p>
              {card.purchaser_name && card.purchaser_name !== "Walk-in" && (
                <p className="text-fog text-xs mt-3">A gift from {card.purchaser_name}</p>
              )}
            </div>
            <div className="bg-chalk rounded-xl p-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Redeem QR code" width={110} height={110} />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-steel/70 flex items-center justify-between">
            <p className="text-fog text-[11px]">Redeemable in-store at {tenant.name}</p>
            <p className="text-fog text-[11px]">Scan to redeem</p>
          </div>
        </div>
      </div>

      <p className="text-fog text-xs mt-6 print:hidden max-w-[500px] text-center">
        Staff: scanning the QR code (or opening this card's redeem link) with a phone camera opens the redemption
        screen, where the balance can be marked as used.
      </p>
    </main>
  );
}
