export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redeemReferral } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const result = await redeemReferral({
      referralCode: body.referralCode,
      newCustomer: {
        name: body.name,
        surname: body.surname,
        mobile: body.mobile,
        email: body.email ?? null,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
