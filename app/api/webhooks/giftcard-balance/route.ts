export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getGiftCardByCode } from "@/lib/db";

export async function GET(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const card = await getGiftCardByCode(code.trim().toUpperCase());
  if (!card) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    code: card.code,
    initial_value: card.initial_value,
    balance: card.balance,
    purchaser_name: card.purchaser_name,
  });
}
