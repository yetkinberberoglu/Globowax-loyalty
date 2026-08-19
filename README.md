# Globowax Club

Loyalty, rewards & CRM platform for Globowax, built as a separate project from
the existing app.globowaxmalta.com car wash tool (to be integrated later via API).

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth).

## Setup — if you already ran 0001_init.sql and seed.sql before

You just need to add the auth migration and a couple of new env vars:

1. In the Supabase SQL Editor, run `supabase/migrations/0002_auth.sql`.
   It adds a login link column to customers and staff — nothing existing
   breaks or needs re-seeding.
2. Create your own staff login (there's no public admin signup, by
   design): Supabase Dashboard → Authentication → Users → Add user, using
   your own email + a password. Copy that user's UUID. Then run in the
   SQL Editor:
   ```sql
   insert into app_users (tenant_id, role, email, full_name, auth_user_id)
   values (
     '11111111-1111-1111-1111-111111111111',
     'tenant_admin',
     'you@example.com',
     'Your Name',
     '<paste the auth user UUID here>'
   );
   ```
3. Copy `.env.local.example` to `.env.local` and fill in, on top of the
   three values you already had:
   - `NEXT_PUBLIC_SUPABASE_URL` — same value as `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the **publishable** key
     (`sb_publishable_...`), NOT the secret one — from the same API Keys
     page. This one is safe to expose to the browser.
4. `npm install && npm run dev`
5. Also add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   as environment variables on Netlify (Site configuration → Environment
   variables), same as you did for the other three, then trigger a redeploy.

## Fresh setup (new project)

1. Create a free Supabase project.
2. Run `supabase/migrations/0001_init.sql`, then `0002_auth.sql`, then
   `supabase/seed.sql` in that order.
3. Follow steps 2-4 above.

## Who can do what now

- **`/` (home)** — entry point with Customer sign in / Join the club / Staff sign in.
- **`/signup`, `/login`** — customer-facing. A customer creates their own
  account (email + password) and is immediately linked to a real
  `customers` row. A referral code can be entered at signup to award both
  sides points, same as before.
- **`/club`** — now shows *the logged-in customer's own data*, not a fixed
  demo account. Includes a real QR code of their card, and a self-service
  "Add vehicle" form.
- **`/admin/login`** — staff-facing. No public signup; you create staff
  accounts by hand (see setup above). Roles: `super_admin`, `tenant_admin`,
  `staff`.
- **`/admin/pos`** ("Counter") — the missing piece from before: search or
  add a customer, pick services, save the transaction (points calculated
  and awarded automatically), plus redeem rewards, vouchers, and gift
  cards, all from one screen. This is what staff actually use day to day.
- **`/admin`, `/admin/insights`, `/admin/giftcards`, `/admin/messages`** —
  unchanged, now gated behind staff login.
- **`/superadmin`** — gated to the `super_admin` role specifically.

## What's real vs. still mock

**On Supabase now:** everything from before, plus real customer/staff
login sessions (Supabase Auth), and vehicle self-registration.

**Still mock / needs real credentials to go live:**
- `lib/providers/{whatsapp,sms,email}.ts` — real send calls are commented
  in, waiting on WhatsApp Cloud API / Twilio / Resend accounts
- `lib/ai/provider.ts` — AI suggestion copy is templated; a real LLM call
  is commented in as the swap point
- Apple/Google Wallet — pass records are real, but actual `.pkpass`
  signing and Google Wallet JWT issuance need those developer accounts
- QR **scanning** — a QR image is generated and shown, but there's no
  camera-based scanner yet; staff currently search by name/mobile on the
  Counter screen instead. Worth adding once the core flow is confirmed
  working.

## Descoped by design
Membership (Stripe recurring subscription) was dropped entirely — all
Globowax payments happen in person at the carwash. Gift cards are
in-store/cash-sold only, no Stripe checkout.

## Security note
`lib/supabase/server.ts` (service role) still bypasses Row Level Security
for all data reads/writes — that hasn't changed. What's new is that
routes are now gated by real login sessions (middleware.ts +
`lib/auth.ts`), so only logged-in customers can reach `/club` and only
logged-in staff can reach `/admin/*`. The RLS policies in the migration
remain written and ready for a future tightening pass where the
per-request Supabase client also carries the user's session instead of
always using the service role — not required for this stage, but the
natural next hardening step before scaling to more tenants.

## Next steps
1. Test the full loop end to end: sign up as a new customer, then from
   `/admin/pos` find that customer and record a wash — confirm points
   land in `/club`.
2. Add a QR camera scanner to the Counter screen.
3. Connect real WhatsApp/SMS/Email/AI/Wallet/Apple/Google credentials as
   each account is set up.
4. Consider moving per-request DB access off the service role and onto
   RLS-enforced, user-scoped queries once there's more than one tenant.
