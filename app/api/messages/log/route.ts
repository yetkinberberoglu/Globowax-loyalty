export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMessageLog } from "@/lib/db";

export async function GET() {
  const log = await listMessageLog();
  return NextResponse.json({ log });
}
