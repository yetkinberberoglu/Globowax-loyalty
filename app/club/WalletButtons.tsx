"use client";

import { useState } from "react";

export function WalletButtons({
  customerId,
  customerName,
  tierName,
  points,
}: {
  customerId: string;
  customerName: string;
  tierName: string;
  points: number;
}) {
  const [issued, setIssued] = useState<{ apple?: string; google?: string }>({});
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);

  async function handleAdd(provider: "apple" | "google") {
    setLoading(provider);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, provider }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.pass) {
      setIssued((prev) => ({ ...prev, [provider]: data.pass.serial_number }));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => handleAdd("apple")}
          disabled={loading === "apple"}
          className="flex-1 py-2.5 rounded-full border border-steel text-sm font-medium disabled:opacity-60"
        >
          {loading === "apple" ? "Adding…" : issued.apple ? "Added to Apple Wallet ✓" : "Add to Apple Wallet"}
        </button>
        <button
          onClick={() => handleAdd("google")}
          disabled={loading === "google"}
          className="flex-1 py-2.5 rounded-full border border-steel text-sm font-medium disabled:opacity-60"
        >
          {loading === "google" ? "Adding…" : issued.google ? "Added to Google Wallet ✓" : "Add to Google Wallet"}
        </button>
      </div>

      {(issued.apple || issued.google) && (
        <div className="rounded-card border border-polish/40 bg-graphite p-4">
          <p className="text-fog text-xs uppercase tracking-wide mb-2">Pass preview</p>
          <div className="rounded-xl bg-ink border border-steel p-4 flex items-center justify-between">
            <div>
              <p className="text-polish text-xs uppercase tracking-wide">Globowax Club</p>
              <p className="font-semibold mt-1">{customerName}</p>
              <p className="text-fog text-xs mt-1">{tierName} · {points} pts</p>
            </div>
            <div className="w-12 h-12 rounded bg-graphite border border-steel grid place-items-center text-[10px] text-fog">
              QR
            </div>
          </div>
          <p className="text-fog text-xs mt-2">
            Serial: {issued.apple ?? issued.google} — synced whenever points or tier change.
          </p>
        </div>
      )}
    </div>
  );
}
