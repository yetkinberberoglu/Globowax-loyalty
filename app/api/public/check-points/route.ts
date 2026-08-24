export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { findCustomerByMobile, listTiers } from "@/lib/db";

/**
 * Public "check my points" lookup — no account/login required, matching
 * what customers were told in the launch announcement (auto-enrolled via
 * their car wash visit, no sign-up needed). Deliberately returns only
 * low-sensitivity fields (first name, tier, points balance) — full
 * account details, rewards redemption, and transaction history still
 * require signing in at /login.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mobile = searchParams.get("mobile");
  if (!mobile) {
    return NextResponse.json({ error: "mobile is required" }, { status: 400 });
  }

  const customer = await findCustomerByMobile(mobile);
  if (!customer) {
    return NextResponse.json({ found: false });
  }

  const tiers = await listTiers();
  const tier = tiers.find((t) => t.id === customer.tier_id);

  return NextResponse.json({
    found: true,
    name: customer.name,
    tier_name: tier?.name ?? null,
    points_balance: customer.points_balance,
  });
}
