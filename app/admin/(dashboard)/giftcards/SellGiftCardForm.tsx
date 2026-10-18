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
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [allServices, setAllServices] = useState(true);
  const [service, setService] = useState("");
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
        fromName,
        toName,
        validForService: allServices ? null : service.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.card) {
      setResult(`Issued ${data.card.code} — €${data.card.initial_value}`);
      setPurchaserName("");
      setRecipientId("");
      setFromName("");
      setToName("");
      setAllServices(true);
      setService("");
      window.open(`/admin/giftcards/print/${data.card.code}`, "_blank");
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

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="From (Kimden?)"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
        />
        <input
          type="text"
          placeholder="To (Kime?)"
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
        />
      </div>

      <div className="space-y-2">
        <p className="text-fog text-xs">Valid for (Hangi servis için?)</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAllServices(true)}
            className={`flex-1 py-2 rounded-full text-sm font-medium border ${
              allServices ? "bg-polish text-ink border-polish" : "border-steel text-fog"
            }`}
          >
            All services
          </button>
          <button
            type="button"
            onClick={() => setAllServices(false)}
            className={`flex-1 py-2 rounded-full text-sm font-medium border ${
              !allServices ? "bg-polish text-ink border-polish" : "border-steel text-fog"
            }`}
          >
            Specific service
          </button>
        </div>
        {!allServices && (
          <input
            type="text"
            placeholder="e.g. Full Wash, Interior Detailing"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
          />
        )}
      </div>

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
