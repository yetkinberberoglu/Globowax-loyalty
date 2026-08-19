export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMessageTemplates } from "@/lib/db";

export async function GET() {
  const templates = await listMessageTemplates();
  return NextResponse.json({ templates });
}
