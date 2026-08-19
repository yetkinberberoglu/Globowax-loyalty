export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/db";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}
