export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listAllGiftCards, sellGiftCard, listGiftCardDenominations } from "@/lib/db";

export async function GET() {
  const [cards, denominations] = await Promise.all([listAllGiftCards(), listGiftCardDenominations()]);
  return NextResponse.json({ cards, denominations });
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const card = await sellGiftCard({
      amount: body.amount,
      purchaserName: body.purchaserName ?? "",
      recipientCustomerId: body.recipientCustomerId ?? null,
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
