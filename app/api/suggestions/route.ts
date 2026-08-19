export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listAISuggestions } from "@/lib/db";

export async function GET() {
  const suggestions = await listAISuggestions();
  return NextResponse.json({ suggestions });
}
