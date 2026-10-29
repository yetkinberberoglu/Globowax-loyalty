"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

type PickerCustomer = {
  id: string;
  name: string;
  surname: string;
  mobile: string;
  plates: string[];
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const normPlate = (s: string) => s.replace(/\s/g, "").toUpperCase();

export function SellGiftCardForm({
  denominations,
  customers,
}: {
  denominations: number[];
  customers: PickerCustomer[];
}) {
  const [amount, setAmount] = useState(denominations[0]);
  const [purchaserName, setPurchaserName] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [allServices, setAllServices] = useState(true);
  const [service, setService] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedCustomer = customers.find((c) => c.id === recipientId) ?? null;

  // Matches on name, mobile (digits only, so +356 / 00356 / spaces all work)
  // and registration number (spaces ignored).
  const matches = useMemo(() => {
    const q = customerSearch.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    const qd = onlyDigits(q);
    const qp = normPlate(q);
    return customers
      .filter((c) => {
        if (`${c.name} ${c.surname}`.toLowerCase().includes(ql)) return true;
        if (qd.length >= 3 && onlyDigits(c.mobile || "").includes(qd)) return true;
        if (qp.length >= 2 && c.plates.some((p) => normPlate(p).includes(qp))) return true;
        return false;
      })
      .slice(0, 8);
  }, [customerSearch, customers]);

  function pickCustomer(c: PickerCustomer) {
    setRecipientId(c.id);
    setCustomerSearch("");
    // Save the staff a keystroke — only fills "To" when it's still empty.
    if (!toName.trim()) setToName(`${c.name} ${c.surname}`.trim());
  }

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
      setCustomerSearch("");
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

      <div className="space-y-2">
        <p className="text-fog text-xs">Link to a customer (optional)</p>

        {selectedCustomer ? (
          <div className="flex items-center justify-between gap-3 bg-ink border border-polish/50 rounded-lg px-3 py-2">
            <div className="text-sm min-w-0">
              <span className="text-chalk">{selectedCustomer.name} {selectedCustomer.surname}</span>
              <span className="text-fog"> · {selectedCustomer.mobile}</span>
              {selectedCustomer.plates.length > 0 && (
                <span className="text-fog"> · {selectedCustomer.plates.join(", ")}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setRecipientId(""); setCustomerSearch(""); }}
              className="text-polish text-xs shrink-0 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search name, mobile or plate — leave empty for a walk-in gift"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
            />
            {customerSearch.trim() && (
              <div className="rounded-lg border border-steel overflow-hidden divide-y divide-steel/60">
                {matches.length === 0 ? (
                  <p className="px-3 py-2 text-fog text-xs">
                    No match. Leave it empty to issue this as a walk-in gift.
                  </p>
                ) : (
                  matches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-graphite"
                    >
                      <span className="text-chalk text-sm">{c.name} {c.surname}</span>
                      <span className="text-fog text-xs">
                        {" · "}{c.mobile}
                        {c.plates.length > 0 ? ` · ${c.plates.join(", ")}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

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
