export const dynamic = "force-dynamic";

import {
  getCustomer,
  listRewards,
  listLedgerForCustomer,
  listVehiclesForCustomer,
  listTiers,
  getStampCardForCustomer,
  listServices,
  listReferralsForCustomer,
  listVouchersForCustomer,
  listNotificationsForCustomer,
  listGiftCardsForCustomer,
} from "@/lib/db";
import { PolishDial } from "./PolishDial";
import { WalletButtons } from "./WalletButtons";
import Link from "next/link";

// Phase 1/2: hardcoded to the demo customer until auth is wired in Phase 1.5.
const DEMO_CUSTOMER_ID = "cus_001";

export default async function ClubHome() {
  const [customer, rewards, ledger, vehicles, tiers, stampCard, services, referrals, vouchers, notifications, giftCards] =
    await Promise.all([
      getCustomer(DEMO_CUSTOMER_ID),
      listRewards(),
      listLedgerForCustomer(DEMO_CUSTOMER_ID),
      listVehiclesForCustomer(DEMO_CUSTOMER_ID),
      listTiers(),
      getStampCardForCustomer(DEMO_CUSTOMER_ID),
      listServices(),
      listReferralsForCustomer(DEMO_CUSTOMER_ID),
      listVouchersForCustomer(DEMO_CUSTOMER_ID),
      listNotificationsForCustomer(DEMO_CUSTOMER_ID),
      listGiftCardsForCustomer(DEMO_CUSTOMER_ID),
    ]);

  if (!customer) return null;

  const stampService = services.find((s) => s.id === stampCard?.service_id);

  const tier = tiers.find((t) => t.id === customer.tier_id);
  const nextTier = tiers.find((t) => t.min_points > customer.points_balance);
  const nextReward = rewards.find((r) => r.points_cost > customer.points_balance) ?? rewards[rewards.length - 1];

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pb-16">
      <div className="pt-4">
        <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>
      </div>
      <header className="pt-4 pb-6 flex items-center justify-between">
        <div>
          <p className="text-fog text-xs uppercase tracking-[0.2em]">Globowax Club</p>
          <h1 className="text-xl font-semibold mt-1">Welcome, {customer.name}</h1>
        </div>
        <div className="text-right">
          <span className="text-xs px-3 py-1.5 rounded-full bg-polish/15 text-polish font-medium">
            {tier?.name ?? "—"}
          </span>
        </div>
      </header>

      {notifications.length > 0 && (
        <section className="mb-2">
          <div className="rounded-card border border-polish/30 bg-polish/10 p-4">
            <p className="text-sm">{notifications[0].message}</p>
          </div>
        </section>
      )}

      <section className="flex flex-col items-center py-4">
        <PolishDial points={customer.points_balance} nextRewardAt={nextReward.points_cost} />
        {tier && (
          <p className="text-fog text-xs mt-3">
            {tier.discount_pct > 0 ? `${tier.discount_pct}% member discount` : "No discount yet"}
            {nextTier ? ` · ${nextTier.min_points - customer.points_balance} pts to ${nextTier.name}` : " · top tier reached"}
          </p>
        )}
      </section>

      <section className="mt-4">
        <WalletButtons
          customerId={customer.id}
          customerName={`${customer.name} ${customer.surname}`}
          tierName={tier?.name ?? "Standard"}
          points={customer.points_balance}
        />
      </section>

      {giftCards.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Gift cards</h2>
          <div className="space-y-2">
            {giftCards.map((g) => (
              <div key={g.id} className="rounded-card border border-steel bg-graphite p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">€{g.balance} remaining</p>
                  <p className="text-fog text-xs mt-0.5">of €{g.initial_value}</p>
                </div>
                <span className="font-mono text-xs text-polish">{g.code}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {vouchers.some((v) => !v.used) && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Vouchers</h2>
          <div className="space-y-2">
            {vouchers.filter((v) => !v.used).map((v) => (
              <div key={v.id} className="rounded-card border border-polish/40 bg-graphite p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {v.discount_type === "fixed" ? `€${v.value} off` : `${v.value}% off`}
                  </p>
                  <p className="text-fog text-xs mt-0.5">Expires {new Date(v.expiry).toLocaleDateString()}</p>
                </div>
                <span className="font-mono text-xs text-polish">{v.code}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {stampCard && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-wide text-fog mb-3">
            {stampService?.name ?? "Stamp"} card
          </h2>
          <div className="rounded-card border border-steel bg-graphite p-4">
            <div className="flex gap-2">
              {Array.from({ length: stampCard.stamps_required }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 aspect-square rounded-lg border grid place-items-center text-sm font-semibold ${
                    i < stampCard.stamps_collected
                      ? "bg-polish text-ink border-polish"
                      : "border-steel text-fog"
                  }`}
                >
                  {i < stampCard.stamps_collected ? "✓" : ""}
                </div>
              ))}
            </div>
            <p className="text-fog text-xs mt-3">
              {stampCard.stamps_required - stampCard.stamps_collected} more for a free wash
            </p>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Rewards</h2>
        <div className="space-y-3">
          {rewards.map((r) => {
            const unlocked = customer.points_balance >= r.points_cost;
            return (
              <div
                key={r.id}
                className={`rounded-card border p-4 flex items-center justify-between ${
                  unlocked ? "border-polish/40 bg-graphite" : "border-steel bg-graphite/50"
                }`}
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-fog text-xs mt-0.5">{r.points_cost} points</p>
                </div>
                <span
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    unlocked ? "bg-polish text-ink" : "bg-steel text-fog"
                  }`}
                >
                  {unlocked ? "Redeem" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">My vehicles</h2>
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-card border border-steel bg-graphite p-4 flex justify-between">
              <span>{v.make} {v.model}</span>
              <span className="text-fog">{v.reg_number}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Refer a friend</h2>
        <div className="rounded-card border border-steel bg-graphite p-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-lg tracking-wider text-polish">{customer.referral_code}</p>
            <p className="text-fog text-xs mt-1">
              {referrals.length} friend{referrals.length === 1 ? "" : "s"} joined · +500 pts each
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full border border-steel text-fog">Share</span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Recent activity</h2>
        <div className="space-y-2">
          {ledger.map((entry) => (
            <div key={entry.id} className="flex justify-between text-sm py-2 border-b border-steel/60">
              <span className="text-fog capitalize">{entry.type}</span>
              <span className={entry.points > 0 ? "text-polish" : "text-chalk"}>
                {entry.points > 0 ? "+" : ""}
                {entry.points} pts
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
