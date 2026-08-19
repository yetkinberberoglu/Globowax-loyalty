export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listVehiclesForCustomer, createVehicle } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }
  const vehicles = await listVehiclesForCustomer(customerId);
  return NextResponse.json({ vehicles });
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const vehicle = await createVehicle({
      customerId: body.customerId,
      make: body.make,
      model: body.model,
      regNumber: body.regNumber,
    });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
