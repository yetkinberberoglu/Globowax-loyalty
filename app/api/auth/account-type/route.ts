export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthedCustomer, getAuthedStaff } from "@/lib/auth";

export async function GET() {
  const customer = await getAuthedCustomer();
  if (customer) return NextResponse.json({ type: "customer" });

  const staff = await getAuthedStaff();
  if (staff) return NextResponse.json({ type: "staff", role: staff.role });

  return NextResponse.json({ type: "none" });
}
