export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listServices } from "@/lib/db";

export async function GET() {
  const services = await listServices();
  return NextResponse.json({ services });
}
