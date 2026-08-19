export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listSegments } from "@/lib/db";

export async function GET() {
  const segments = await listSegments();
  return NextResponse.json({ segments });
}
