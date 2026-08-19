export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listVehiclesForCustomer } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }
  const vehicles = await listVehiclesForCustomer(customerId);
  return NextResponse.json({ vehicles });
}
