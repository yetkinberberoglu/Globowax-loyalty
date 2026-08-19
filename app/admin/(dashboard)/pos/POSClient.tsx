"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Service, Reward } from "@/lib/types";

export function POSClient({
  customers,
  services,
  rewards,
}: {
  customers: Customer[];
  services: Service[];
  rewards: Reward[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "other">("card");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Secondary redemption inputs
  const [voucherCode, setVoucherCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return customers
      .filter((c) => `${c.name} ${c.surname}`.toLowerCase().includes(q) || c.mobile.includes(q))
      .slice(0, 8);
  }, [search, customers]);

  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const pointsToEarn = selectedServices.reduce((sum, s) => sum + s.points_value, 0);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submitTransaction() {
    if (!selected || serviceIds.length === 0) return;
    setIsPending(true);
    setMessage(null);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selected.id,
        vehicleId: null,
        items: selectedServices.map((s) => ({ serviceId: s.id, price: s.price, pointsEarned: s.points_value })),
        paymentMethod,
      }),
    });
    const data = await res.json();
    setIsPending(false);
    if (res.ok) {
      setMessage(`Saved — €${total} recorded, +${pointsToEarn} points. New balance: ${data.ledgerEntry.balance_after}.`);
      setServiceIds([]);
      setSelected(null);
      setSearch("");
      router.refresh();
    } else {
      setMessage(data.error ?? "Something went wrong");
    }
  }

  async function redeemReward(rewardId: string) {
    if (!selected) return;
    setIsPending(true);
    setMessage(null);
    const res = await fetch("/api/points/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: selected.id, rewardId }),
    });
    const data = await res.json();
    setIsPending(false);
    setMessage(res.ok ? `Reward redeemed — code ${data.code}` : data.error ?? "Something went wrong");
    if (res.ok) router.refresh();
  }

  async function redeemVoucher() {
    if (!selected || !voucherCode) return;
    setIsPending(true);
    setMessage(null);
    const res = await fetch("/api/vouchers/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: selected.id, code: voucherCode }),
    });
    const data = await res.json();
    setIsPending(false);
    setMessage(res.ok ? `Voucher applied — €${data.voucher.value} off` : data.error ?? "Something went wrong");
    if (res.ok) setVoucherCode("");
  }

  async function redeemGiftCard() {
    if (!giftCardCode || !giftCardAmount) return;
    setIsPending(true);
    setMessage(null);
    const res = await fetch("/api/giftcards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftCardCode, amount: Number(giftCardAmount) }),
    });
    const data = await res.json();
    setIsPending(false);
    setMessage(res.ok ? `Gift card charged — €${data.card.balance} remaining` : data.error ?? "Something went wrong");
    if (res.ok) {
      setGiftCardCode("");
      setGiftCardAmount("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Customer search / select */}
      {!selected ? (
        <section>
          <input
            placeholder="Search by name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          {filtered.length > 0 && (
            <div className="mt-2 rounded-card border border-steel overflow-hidden">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setSearch("");
                  }}
                  className="w-full text-left px-4 py-3 border-b border-steel/60 last:border-b-0 hover:bg-graphite flex justify-between"
                >
                  <span>{c.name} {c.surname}</span>
                  <span className="text-fog text-sm">{c.mobile} · {c.points_balance} pts</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowNewCustomer((v) => !v)}
            className="mt-3 text-xs text-polish hover:underline"
          >
            + New customer
          </button>
          {showNewCustomer && <NewCustomerForm onCreated={(c) => { setSelected(c); setShowNewCustomer(false); }} />}
        </section>
      ) : (
        <section className="rounded-card border border-polish/40 bg-graphite p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{selected.name} {selected.surname}</p>
            <p className="text-fog text-xs mt-0.5">{selected.mobile} · {selected.points_balance} points</p>
          </div>
          <button onClick={() => setSelected(null)} className="text-xs text-fog hover:text-chalk">
            Change
          </button>
        </section>
      )}

      {/* Service selection + submit */}
      {selected && (
        <>
          <section>
            <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Services</h2>
            <div className="space-y-2">
              {services.map((s) => {
                const active = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`w-full flex items-center justify-between rounded-card border p-4 text-left ${
                      active ? "border-polish bg-polish/10" : "border-steel bg-graphite"
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="text-fog text-sm">€{s.price} · +{s.points_value} pts</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex items-center gap-2">
            {(["card", "cash", "other"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`px-4 py-2 rounded-full text-sm border capitalize ${
                  paymentMethod === m ? "bg-polish text-ink border-polish" : "border-steel text-fog"
                }`}
              >
                {m}
              </button>
            ))}
          </section>

          <section className="rounded-card border border-steel bg-graphite p-4 flex items-center justify-between">
            <div>
              <p className="text-fog text-xs uppercase">Total</p>
              <p className="text-2xl font-display font-bold">€{total}</p>
            </div>
            <button
              onClick={submitTransaction}
              disabled={serviceIds.length === 0 || isPending}
              className="px-6 py-3 rounded-full bg-polish text-ink font-semibold disabled:opacity-50"
            >
              {isPending ? "Saving…" : `Save · +${pointsToEarn} pts`}
            </button>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Redeem</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {rewards
                  .filter((r) => selected.points_balance >= r.points_cost)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => redeemReward(r.id)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-full border border-steel text-sm hover:border-polish disabled:opacity-50"
                    >
                      {r.name} · {r.points_cost} pts
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="flex-1 bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
                />
                <button
                  onClick={redeemVoucher}
                  disabled={!voucherCode || isPending}
                  className="px-4 py-2 rounded-full border border-steel text-sm disabled:opacity-50"
                >
                  Apply
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Gift card code"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value)}
                  className="flex-1 bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
                />
                <input
                  placeholder="Amount €"
                  type="number"
                  value={giftCardAmount}
                  onChange={(e) => setGiftCardAmount(e.target.value)}
                  className="w-28 bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
                />
                <button
                  onClick={redeemGiftCard}
                  disabled={!giftCardCode || !giftCardAmount || isPending}
                  className="px-4 py-2 rounded-full border border-steel text-sm disabled:opacity-50"
                >
                  Charge
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {message && (
        <div className="rounded-card border border-polish/40 bg-polish/10 p-4 text-sm">{message}</div>
      )}
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: (c: Customer) => void }) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const res = await fetch("/api/customers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, surname, mobile, email: email || null }),
    });
    const data = await res.json();
    setIsPending(false);
    if (res.ok) {
      onCreated(data.customer);
    } else {
      setError(data.error ?? "Something went wrong");
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-card border border-steel bg-graphite p-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input required placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} className="bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog" />
        <input required placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} className="bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog" />
      </div>
      <input required placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog" />
      <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog" />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={isPending} className="w-full py-2 rounded-full bg-polish text-ink text-sm font-medium disabled:opacity-60">
        {isPending ? "Saving…" : "Add customer"}
      </button>
    </form>
  );
}
