export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listTiers } from "@/lib/db";

export async function GET() {
  const tiers = await listTiers();
  return NextResponse.json({ tiers });
}
