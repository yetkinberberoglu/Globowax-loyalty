export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { registerCustomer, findCustomerByMobile, linkAuthUserToCustomer, getCustomerByReferralCode, awardPoints } from "@/lib/db";

const REFERRAL_REWARD = { referrer: 500, referred: 250 };

export async function POST(req: Request) {
  const body = await req.json();
  const { authUserId, name, surname, mobile, email, referralCode } = body;

  if (!authUserId || !name || !surname || !mobile || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify this is a real, just-created Supabase Auth user — not just any
  // UUID a client could send. Prevents someone from linking an arbitrary
  // ID to a customer row without actually having authenticated.
  const { data: authUser, error: authErr } = await supabaseServer().auth.admin.getUserById(authUserId);
  if (authErr || !authUser?.user) {
    return NextResponse.json({ error: "Could not verify the new account" }, { status: 400 });
  }

  try {
    // A customer row for this phone number might already exist — e.g.
    // created by the app.globowaxmalta.com webhook from an earlier
    // in-store visit before this person ever signed up for an account.
    // Link to that one instead of creating a second, empty customer.
    const existing = await findCustomerByMobile(mobile);
    const customer = existing
      ? await linkAuthUserToCustomer(existing.id, authUserId)
      : await registerCustomer({ name, surname, mobile, email, authUserId });

    if (referralCode && !existing) {
      const referrer = await getCustomerByReferralCode(referralCode);
      if (referrer && referrer.mobile !== mobile) {
        await awardPoints(referrer.id, REFERRAL_REWARD.referrer, "earning");
        await awardPoints(customer.id, REFERRAL_REWARD.referred, "earning");
      }
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
