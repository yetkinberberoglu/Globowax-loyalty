export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCustomerBalanceByMobile } from "@/lib/db";

export async function GET(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mobile = searchParams.get("mobile");
  if (!mobile) {
    return NextResponse.json({ error: "mobile is required" }, { status: 400 });
  }

  const result = await getCustomerBalanceByMobile(mobile);
  return NextResponse.json(result);
}
