export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redeemGiftCard } from "@/lib/db";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.code || typeof body.amount !== "number") {
    return NextResponse.json({ error: "code and amount are required" }, { status: 400 });
  }

  try {
    const card = await redeemGiftCard({ code: body.code.trim().toUpperCase(), amount: body.amount });
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
