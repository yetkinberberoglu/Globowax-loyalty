export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runAutomationEngine } from "@/lib/db";

export async function POST() {
  const result = await runAutomationEngine();
  return NextResponse.json(result);
}
