export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/db";

export async function GET() {
  const summary = await getDashboardSummary();
  return NextResponse.json(summary);
}
