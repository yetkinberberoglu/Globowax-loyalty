"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SellGiftCardForm({
  denominations,
  customers,
}: {
  denominations: number[];
  customers: { id: string; name: string; surname: string }[];
}) {
  const [amount, setAmount] = useState(denominations[0]);
  const [purchaserName, setPurchaserName] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const res = await fetch("/api/giftcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        purchaserName,
        recipientCustomerId: recipientId || null,
      }),
    });
    const data = await res.json();
    if (data.card) {
      setResult(`Issued ${data.card.code} — €${data.card.initial_value}`);
      setPurchaserName("");
      setRecipientId("");
      startTransition(() => router.refresh());
    } else {
      setResult(data.error ?? "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-steel bg-graphite p-4 space-y-3">
      <div className="flex gap-2">
        {denominations.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setAmount(d)}
            className={`flex-1 py-2 rounded-full text-sm font-medium border ${
              amount === d ? "bg-polish text-ink border-polish" : "border-steel text-fog"
            }`}
          >
            €{d}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Purchaser name (optional)"
        value={purchaserName}
        onChange={(e) => setPurchaserName(e.target.value)}
        className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
      />

      <select
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
        className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm text-fog"
      >
        <option value="">No linked customer (walk-in gift)</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name} {c.surname}</option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-full bg-polish text-ink font-medium text-sm disabled:opacity-60"
      >
        {isPending ? "Issuing…" : `Sell €${amount} gift card`}
      </button>

      {result && <p className="text-fog text-xs">{result}</p>}
    </form>
  );
}
