export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createTransaction } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const result = await createTransaction({
      customerId: body.customerId,
      vehicleId: body.vehicleId ?? null,
      staffId: body.staffId ?? "staff_001",
      items: body.items,
      paymentMethod: body.paymentMethod ?? "card",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
