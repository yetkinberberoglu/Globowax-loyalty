# Globowax Club — Phases 1-6, now on Supabase

Loyalty, rewards & CRM platform for Globowax, built as a separate project from
the existing app.globowaxmalta.com car wash tool (to be integrated later via API).

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres).
`lib/db.ts` is the single data-access layer — every API route and page reads
through it, and it now queries Supabase directly (see `lib/supabase/server.ts`).

## Setup

1. Create a free Supabase project at supabase.com.
2. In the Supabase SQL Editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql` (loads the same demo data — Globowax Malta, John Smith,
   Maria Vella — you've already been testing with).
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
     Project Settings → API in your Supabase dashboard
   - `TENANT_ID` — already defaults to the seeded Globowax Malta id, leave as is
4. `npm install && npm run dev`

Visit `/admin` for the tenant dashboard, `/club` for the customer PWA view,
`/superadmin` for the cross-tenant platform-owner view.

## What's real vs. still mock

**On Supabase now (Phases 1-6 core):** customers, vehicles, services,
transactions, points ledger (a DB trigger keeps `customers.points_balance`
in sync automatically), tiers, rewards, stamp cards, referrals, vouchers,
gift cards, campaigns + automation engine, notifications, message templates
and send log, wallet pass records, AI insights/segments/suggestions, usage
tokens, billing, and the multi-tenant `tenants` table.

**Still mock / needs real credentials to go live:**
- `lib/providers/{whatsapp,sms,email}.ts` — real send calls are commented in,
  waiting on WhatsApp Cloud API / Twilio / Resend accounts
- `lib/ai/provider.ts` — AI suggestion copy is templated; a real LLM call
  (e.g. Anthropic API) is commented in as the swap point
- Apple/Google Wallet — pass *records* are real and persist to
  `wallet_passes`, but actual `.pkpass` signing (Apple Developer cert) and
  Google Wallet JWT issuance need those developer accounts connected

## Descoped by design
Membership (Stripe recurring subscription) was dropped entirely — all
Globowax payments happen in person at the carwash. Gift cards are
in-store/cash-sold only, no Stripe checkout.

## Security note
`lib/supabase/server.ts` uses the **service role key**, which bypasses Row
Level Security — safe today because `lib/db.ts` is only ever imported from
Server Components and API routes (never shipped to the browser), and there's
no per-request customer/staff auth session yet. The RLS policies in the
migration are already written and will take effect the moment Supabase Auth
is wired in and requests carry a `tenant_id` JWT claim — that's the next
piece of plumbing, not a rewrite.

## Next steps
1. Verify the Supabase connection: run the app, check `/admin` shows John
   and Maria with real data from Postgres (not the old mock numbers).
2. Wire Supabase Auth (staff login for `/admin`, customer login for `/club`).
3. Free → Pro Supabase plan when ready for production traffic.
4. Connect real WhatsApp/SMS/Email/AI/Wallet/Apple/Google credentials as
   each account is set up — every swap point is commented in its file.
