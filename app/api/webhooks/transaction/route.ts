export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { recordExternalTransaction } from "@/lib/db";

/**
 * Called by app.globowaxmalta.com (the car wash check-in/payment tool)
 * whenever a payment completes, so the customer earns Globowax Club
 * points without staff having to enter the same visit twice.
 *
 * Auth: shared secret via the X-Webhook-Secret header, checked against
 * the WEBHOOK_SECRET env var (set this to the same value on both apps).
 *
 * Body: { mobile, name?, surname?, amount, serviceName?, paymentMethod?, externalRef? }
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.mobile || typeof body.amount !== "number") {
    return NextResponse.json({ error: "mobile and amount are required" }, { status: 400 });
  }

  try {
    const result = await recordExternalTransaction({
      mobile: body.mobile,
      name: body.name,
      surname: body.surname,
      amount: body.amount,
      serviceName: body.serviceName,
      paymentMethod: body.paymentMethod,
      externalRef: body.externalRef,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
