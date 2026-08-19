export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redeemVoucher } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const voucher = await redeemVoucher({ code: body.code, customerId: body.customerId });
    return NextResponse.json({ voucher });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
