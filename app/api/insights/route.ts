export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCustomerInsights } from "@/lib/db";

export async function GET() {
  const insights = await listCustomerInsights();
  return NextResponse.json({ insights });
}
