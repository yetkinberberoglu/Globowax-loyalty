"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RedeemForm({ code, balance }: { code: string; balance: number }) {
  const [amount, setAmount] = useState(String(balance));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  async function redeem(redeemAmount: number) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/giftcards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount: redeemAmount }),
      });
      const data = await res.json();
      if (data.card) {
        setResult({ ok: true, message: `Redeemed €${redeemAmount}. Remaining balance: €${data.card.balance}` });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? "Something went wrong" });
      }
    } catch {
      setResult({ ok: false, message: "Could not reach the server" });
    }
    setLoading(false);
  }

  if (result?.ok) {
    return (
      <div className="text-center">
        <p className="text-polish text-lg font-semibold">✓ Marked as used</p>
        <p className="text-fog text-sm mt-2">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => redeem(balance)}
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-polish text-ink font-semibold disabled:opacity-60"
      >
        {loading ? "Redeeming…" : `Mark as fully used — €${balance}`}
      </button>

      <div className="flex items-center gap-2 text-fog text-xs">
        <div className="flex-1 h-px bg-steel" />
        or redeem a partial amount
        <div className="flex-1 h-px bg-steel" />
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={0.01}
          max={balance}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-graphite border border-steel rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={() => redeem(parseFloat(amount))}
          disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
          className="px-5 py-3 rounded-lg border border-steel text-chalk font-medium text-sm disabled:opacity-40"
        >
          Redeem
        </button>
      </div>

      {result && !result.ok && <p className="text-red-400 text-xs text-center">{result.message}</p>}
    </div>
  );
}
