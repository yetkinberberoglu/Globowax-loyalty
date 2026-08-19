export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createCampaignFromSuggestion } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const campaign = await createCampaignFromSuggestion(body.suggestionId);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
