export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listRewards } from "@/lib/db";

export async function GET() {
  const rewards = await listRewards();
  return NextResponse.json({ rewards });
}
