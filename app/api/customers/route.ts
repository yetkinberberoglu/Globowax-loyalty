export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCustomers } from "@/lib/db";

export async function GET() {
  const customers = await listCustomers();
  return NextResponse.json({ customers });
}
