export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { registerCustomer } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const customer = await registerCustomer({
      name: body.name,
      surname: body.surname,
      mobile: body.mobile,
      email: body.email ?? null,
      authUserId: null,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
