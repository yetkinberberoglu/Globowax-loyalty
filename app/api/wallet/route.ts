export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listWalletPasses, issueWalletPass } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  const passes = await listWalletPasses(customerId);
  return NextResponse.json({ passes });
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const pass = await issueWalletPass(body.customerId, body.provider);
    return NextResponse.json({ pass }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
