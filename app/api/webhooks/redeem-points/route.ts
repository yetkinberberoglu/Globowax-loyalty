export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redeemPointsForCash } from "@/lib/db";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.mobile || typeof body.points !== "number") {
    return NextResponse.json({ error: "mobile and points are required" }, { status: 400 });
  }

  try {
    const result = await redeemPointsForCash({ mobile: body.mobile, points: body.points });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
