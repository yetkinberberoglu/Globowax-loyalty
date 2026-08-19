export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redeemReward } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const redemption = await redeemReward({
      customerId: body.customerId,
      rewardId: body.rewardId,
      staffId: body.staffId ?? null,
    });
    return NextResponse.json({ redemption }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
