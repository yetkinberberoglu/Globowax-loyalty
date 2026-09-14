import { supabaseServer } from "./supabase/server";
import type {
  Customer,
  Transaction,
  TransactionItem,
  PointsLedgerEntry,
  DashboardSummary,
  Reward,
  RewardRedemption,
  StampCard,
  Referral,
  Voucher,
  Campaign,
  Notification,
  MessageTemplate,
  MessageLogEntry,
  MessageChannel,
  WalletPass,
  GiftCard,
  CustomerInsight,
  CustomerSegment,
  AISuggestion,
  Tenant,
  TenantBilling,
  TokenUsageEntry,
  TokenAction,
  LoyaltyTier,
  Service,
} from "./types";
import { computeCustomerInsight, computeSegments } from "./ai/engine";
import { generateSuggestions } from "./ai/suggestions";
import { whatsappProvider } from "./providers/whatsapp";
import { smsProvider } from "./providers/sms";
import { emailProvider } from "./providers/email";
import type { MessageProvider } from "./providers/types";

// ---------------------------------------------------------------------------
// Data access layer for Globowax Club — now backed by Supabase (Postgres).
//
// Every function queries the tables in supabase/migrations/0001_init.sql
// through the service-role client in lib/supabase/server.ts. Call sites in
// API routes and pages are untouched from the mock-data version — same
// function names, same shapes in/out, per the original contract.
// ---------------------------------------------------------------------------

const TENANT_ID = process.env.TENANT_ID ?? "";

/**
 * True if two phone numbers likely belong to the same person, even across
 * common real-world entry inconsistencies: spacing/punctuation, a missing
 * "+", or — the trickiest one — a missing country code (e.g. staff typing
 * the local 8-digit Malta number "99427015" instead of "+35699427015").
 * Exact digits match first; if that fails, treat it as a match when the
 * shorter number's digits are a suffix of the longer one's, as long as the
 * shorter one is at least 7 digits (avoids false positives on very short
 * inputs matching by coincidence).
 */
function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db_ = b.replace(/\D/g, "");
  if (!da || !db_) return false;
  if (da === db_) return true;
  const [shorter, longer] = da.length <= db_.length ? [da, db_] : [db_, da];
  return shorter.length >= 7 && longer.endsWith(shorter);
}

function db() {
  return supabaseServer();
}

const TOKEN_COSTS: Record<TokenAction, number> = {
  loyalty_transaction: 1,
  whatsapp_message: 1,
  sms_message: 1,
  email_message: 1,
  ai_analysis: 5,
  wallet_update: 1,
};

const GIFT_CARD_DENOMINATIONS = [50, 100, 250, 500];
const REFERRAL_REWARD = { referrer: 500, referred: 250 };

async function recordTokenUsage(action: TokenAction, tenantId: string = TENANT_ID) {
  const client = db();
  const tokens = TOKEN_COSTS[action] ?? 1;
  const { error } = await client.from("usage_tokens").insert({ tenant_id: tenantId, action, tokens });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Tenant / core identity
// ---------------------------------------------------------------------------

export async function getTenant(): Promise<Tenant> {
  const { data, error } = await db().from("tenants").select("*").eq("id", TENANT_ID).single();
  if (error || !data) throw new Error(error?.message ?? "Tenant not found");
  return data as Tenant;
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await db().from("customers").select("*").eq("tenant_id", TENANT_ID).order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const { data, error } = await db().from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Customer) ?? undefined;
}

export async function listTiers(): Promise<LoyaltyTier[]> {
  const { data, error } = await db()
    .from("loyalty_tiers")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .order("min_points");
  if (error) throw new Error(error.message);
  return (data ?? []) as LoyaltyTier[];
}

async function getTiersDesc() {
  const { data, error } = await db()
    .from("loyalty_tiers")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .order("min_points", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LoyaltyTier[];
}

/**
 * Tier is always derived from points_balance, never set by hand — mirrors
 * the ledger rule for points. Recomputed here whenever a balance changes.
 */
async function recalculateTier(customerId: string, newBalance: number) {
  const tiers = await getTiersDesc();
  const tier = tiers.find((t) => newBalance >= t.min_points);
  if (tier) {
    const { error } = await db().from("customers").update({ tier_id: tier.id }).eq("id", customerId);
    if (error) throw new Error(error.message);
  }
}

export async function listServices(): Promise<import("./types").Service[]> {
  const { data, error } = await db()
    .from("services")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .eq("active", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listRewards(): Promise<Reward[]> {
  const { data, error } = await db()
    .from("rewards")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .eq("active", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as Reward[];
}

export async function listVehiclesForCustomer(customerId: string) {
  const { data, error } = await db().from("vehicles").select("*").eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Self-service vehicle registration — a customer adding their own car
 * from the /club screen. Kept intentionally minimal (make, model,
 * reg number) since that's all the doc's Vehicle CRM strictly needs to
 * function; year/colour/fuel_type stay optional for later.
 */
export async function createVehicle(input: {
  customerId: string;
  make: string;
  model: string;
  regNumber: string;
}) {
  const { data, error } = await db()
    .from("vehicles")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: input.customerId,
      make: input.make,
      model: input.model,
      reg_number: input.regNumber,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to add vehicle");
  return data;
}

export async function listLedgerForCustomer(customerId: string): Promise<PointsLedgerEntry[]> {
  const { data, error } = await db()
    .from("points_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PointsLedgerEntry[];
}

// ---------------------------------------------------------------------------
// Stamp cards
// ---------------------------------------------------------------------------

export async function getStampCardForCustomer(customerId: string): Promise<StampCard | undefined> {
  const { data, error } = await db().from("stamp_cards").select("*").eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StampCard) ?? undefined;
}

export async function earnStamps(customerId: string, transactionId: string, serviceIds: string[]) {
  const { data: card, error } = await db()
    .from("stamp_cards")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!card) return;

  const matches = serviceIds.filter((id) => id === card.service_id).length;
  if (matches === 0) return;

  let stampsCollected = card.stamps_collected;
  for (let i = 0; i < matches; i++) {
    stampsCollected += 1;
    await db()
      .from("stamp_transactions")
      .insert({ tenant_id: TENANT_ID, stamp_card_id: card.id, transaction_id: transactionId, type: "stamp_earned" });
    if (stampsCollected >= card.stamps_required) {
      stampsCollected = 0;
      await db()
        .from("stamp_transactions")
        .insert({ tenant_id: TENANT_ID, stamp_card_id: card.id, transaction_id: null, type: "card_redeemed" });
    }
  }
  await db().from("stamp_cards").update({ stamps_collected: stampsCollected }).eq("id", card.id);
}

// ---------------------------------------------------------------------------
// Transactions, points, rewards
// ---------------------------------------------------------------------------

/**
 * Records a transaction + its line items, then appends a single
 * points_ledger entry. A Postgres trigger (sync_customer_points_balance)
 * keeps customers.points_balance in sync with the ledger automatically —
 * the ledger row is still the only thing this function writes directly to
 * balance-affecting state, per the platform's own design rule.
 */
export async function createTransaction(input: {
  customerId: string;
  vehicleId: string | null;
  staffId: string | null;
  items: { serviceId: string; price: number; pointsEarned: number }[];
  paymentMethod: Transaction["payment_method"];
}): Promise<{ transaction: Transaction; ledgerEntry: PointsLedgerEntry }> {
  const client = db();

  const { data: customer, error: custErr } = await client
    .from("customers")
    .select("*")
    .eq("id", input.customerId)
    .single();
  if (custErr || !customer) throw new Error("Customer not found");

  const totalAmount = input.items.reduce((sum, i) => sum + i.price, 0);
  const totalPoints = input.items.reduce((sum, i) => sum + i.pointsEarned, 0);

  const { data: transaction, error: txnErr } = await client
    .from("transactions")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: input.customerId,
      vehicle_id: input.vehicleId,
      staff_id: input.staffId || null,
      total_amount: totalAmount,
      payment_method: input.paymentMethod,
    })
    .select()
    .single();
  if (txnErr || !transaction) throw new Error(txnErr?.message ?? "Failed to create transaction");

  const itemsPayload = input.items.map((i) => ({
    transaction_id: transaction.id,
    service_id: i.serviceId,
    price: i.price,
    points_earned: i.pointsEarned,
  }));
  const { error: itemsErr } = await client.from("transaction_items").insert(itemsPayload);
  if (itemsErr) throw new Error(itemsErr.message);

  const newBalance = Number(customer.points_balance) + totalPoints;
  const { data: ledgerEntry, error: ledgerErr } = await client
    .from("points_ledger")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: input.customerId,
      transaction_id: transaction.id,
      type: "earning",
      points: totalPoints,
      balance_after: newBalance,
    })
    .select()
    .single();
  if (ledgerErr || !ledgerEntry) throw new Error(ledgerErr?.message ?? "Failed to write ledger entry");

  await recalculateTier(input.customerId, newBalance);
  await earnStamps(input.customerId, transaction.id, input.items.map((i) => i.serviceId));
  await recordTokenUsage("loyalty_transaction");

  return { transaction: transaction as Transaction, ledgerEntry: ledgerEntry as PointsLedgerEntry };
}

/**
 * Records a transaction that originated in an external system (the
 * app.globowaxmalta.com check-in/payment tool) rather than the Club's own
 * POS screen. Looks the customer up by mobile number — auto-registering
 * them as a Club member if they don't have one yet, so points start
 * accruing from their very first external visit. If a serviceName is
 * given and matches a row in `services`, points/price and stamp-card
 * progress follow that service exactly; otherwise falls back to the
 * doc's default €1 = 1 point rate on the raw amount.
 */
export async function recordExternalTransaction(input: {
  mobile: string;
  name?: string;
  surname?: string;
  amount: number;
  serviceName?: string;
  paymentMethod?: Transaction["payment_method"];
  // A stable identifier for the source event (e.g. the vehicle's own id
  // in app.globowaxmalta.com). When provided, a transaction is only ever
  // recorded once per externalRef — a retried webhook call (e.g. after a
  // dropped response on the caller's side, even if we'd already fully
  // processed it) is detected and skipped instead of double-counting
  // points, no matter how many times or how much later it's retried.
  externalRef?: string;
}): Promise<{ transaction: Transaction; ledgerEntry: PointsLedgerEntry | null; customer: Customer; duplicate?: boolean }> {
  const client = db();

  if (input.externalRef) {
    const { data: existingTxn } = await client
      .from("transactions")
      .select("*")
      .eq("external_ref", input.externalRef)
      .maybeSingle();
    if (existingTxn) {
      const { data: existingCustomer } = await client
        .from("customers")
        .select("*")
        .eq("id", existingTxn.customer_id)
        .single();
      const { data: existingLedger } = await client
        .from("points_ledger")
        .select("*")
        .eq("transaction_id", existingTxn.id)
        .maybeSingle();
      return { transaction: existingTxn, ledgerEntry: existingLedger ?? null, customer: existingCustomer, duplicate: true };
    }
  }

  let { data: customer } = await client.from("customers").select("*").eq("mobile", input.mobile).maybeSingle();

  // The two apps may store phone numbers in slightly different formats
  // ("+356 9912 3456" vs "+35699123456", or missing the country code
  // entirely). If an exact match fails, fall back to phonesMatch before
  // giving up and creating a new customer — this keeps the same person
  // from ending up with two separate Club accounts just because of
  // formatting.
  if (!customer) {
    const { data: candidates } = await client.from("customers").select("*").eq("tenant_id", TENANT_ID);
    customer = (candidates ?? []).find((c) => phonesMatch(c.mobile, input.mobile)) ?? null;
  }
  if (!customer) {
    customer = await registerCustomer({
      name: input.name || "Globowax",
      surname: input.surname || "Customer",
      mobile: input.mobile,
      email: null,
      authUserId: null,
    });
  } else if (input.name && customer.name === "Globowax" && customer.surname === "Customer") {
    // An earlier visit had no owner name filled in, so this customer got
    // created with the "Globowax Customer" placeholder — fix it now that
    // a real name has come through, without ever touching a name a
    // customer or staff already set correctly.
    const { data: updated } = await client
      .from("customers")
      .update({ name: input.name, surname: input.surname || customer.surname })
      .eq("id", customer.id)
      .select()
      .single();
    if (updated) customer = updated;
  }

  let matchedService: Service | null = null;
  if (input.serviceName) {
    const { data } = await client
      .from("services")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .ilike("name", input.serviceName)
      .maybeSingle();
    matchedService = (data as Service) ?? null;
  }

  const pointsEarned = matchedService ? matchedService.points_value : Math.round(input.amount);

  const { data: transaction, error: txnErr } = await client
    .from("transactions")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: customer.id,
      vehicle_id: null,
      staff_id: null,
      total_amount: input.amount,
      payment_method: input.paymentMethod ?? "card",
      external_ref: input.externalRef ?? null,
    })
    .select()
    .single();
  if (txnErr || !transaction) throw new Error(txnErr?.message ?? "Failed to record external transaction");

  if (matchedService) {
    await client.from("transaction_items").insert({
      transaction_id: transaction.id,
      service_id: matchedService.id,
      price: input.amount,
      points_earned: pointsEarned,
    });
  }

  const newBalance = Number(customer.points_balance) + pointsEarned;
  const { data: ledgerEntry, error: ledgerErr } = await client
    .from("points_ledger")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: customer.id,
      transaction_id: transaction.id,
      type: "earning",
      points: pointsEarned,
      balance_after: newBalance,
    })
    .select()
    .single();
  if (ledgerErr || !ledgerEntry) throw new Error(ledgerErr?.message ?? "Failed to write ledger entry");

  await recalculateTier(customer.id, newBalance);
  if (matchedService) {
    await earnStamps(customer.id, transaction.id, [matchedService.id]);
  }
  await recordTokenUsage("loyalty_transaction");

  return {
    transaction: transaction as Transaction,
    ledgerEntry: ledgerEntry as PointsLedgerEntry,
    customer: { ...customer, points_balance: newBalance } as Customer,
  };
}

/**
 * Redeems a reward: debits the ledger (trigger updates the cached
 * balance), recalculates tier, and issues a redemption record with a
 * unique code.
 */
export async function redeemReward(input: {
  customerId: string;
  rewardId: string;
  staffId: string | null;
}): Promise<RewardRedemption> {
  const client = db();
  const [{ data: customer }, { data: reward }] = await Promise.all([
    client.from("customers").select("*").eq("id", input.customerId).single(),
    client.from("rewards").select("*").eq("id", input.rewardId).single(),
  ]);
  if (!customer || !reward) throw new Error("Customer or reward not found");
  if (Number(customer.points_balance) < reward.points_cost) {
    throw new Error("Insufficient points balance");
  }

  const newBalance = Number(customer.points_balance) - reward.points_cost;
  const { error: ledgerErr } = await client.from("points_ledger").insert({
    tenant_id: TENANT_ID,
    customer_id: input.customerId,
    transaction_id: null,
    type: "redemption",
    points: -reward.points_cost,
    balance_after: newBalance,
  });
  if (ledgerErr) throw new Error(ledgerErr.message);
  await recalculateTier(input.customerId, newBalance);

  const code = `GW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data: redemption, error } = await client
    .from("reward_redemptions")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: input.customerId,
      reward_id: input.rewardId,
      code,
      qr_code: code,
      staff_id: input.staffId || null,
    })
    .select()
    .single();
  if (error || !redemption) throw new Error(error?.message ?? "Failed to redeem reward");
  return redemption as RewardRedemption;
}

export async function awardPoints(customerId: string, points: number, type: PointsLedgerEntry["type"]) {
  const client = db();
  const { data: customer } = await client.from("customers").select("points_balance").eq("id", customerId).single();
  const newBalance = Number(customer?.points_balance ?? 0) + points;
  const { error } = await client.from("points_ledger").insert({
    tenant_id: TENANT_ID,
    customer_id: customerId,
    transaction_id: null,
    type,
    points,
    balance_after: newBalance,
  });
  if (error) throw new Error(error.message);
  await recalculateTier(customerId, newBalance);
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export async function listReferralsForCustomer(customerId: string): Promise<Referral[]> {
  const { data, error } = await db().from("referrals").select("*").eq("referrer_customer_id", customerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Referral[];
}

/**
 * Signs up a new customer against an existing customer's referral code and
 * awards both sides. Fraud prevention: a customer can never redeem their
 * own code, matched on mobile number since every customer has one.
 */
/**
 * Direct customer registration — no referral code required. Used by
 * /signup (with authUserId set, linking the new Supabase Auth user) and
 * by staff creating a walk-in customer from the POS screen (authUserId
 * left null; that customer can link their own login later by signing up
 * with the same mobile/email, or staff can link it manually).
 */
export async function getCustomerByReferralCode(code: string): Promise<Customer | undefined> {
  const { data, error } = await db().from("customers").select("*").eq("referral_code", code).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Customer) ?? undefined;
}

// Redemption rate shared by the fixed Rewards catalog and this flexible
// points-as-cash redemption: 20 points = €1 of discount value (5% cashback
// on the €1=1pt earning rate). Keep this in sync with rewards.points_cost
// if the ratio ever changes — see supabase/seed.sql for the catalog side.
export const POINTS_PER_EURO = 20;

/**
 * Looks up a customer's current points balance by mobile — used by staff
 * in app.globowaxmalta.com to check what a customer has available before
 * offering a points redemption at checkout. Read-only, no side effects.
 */
export async function getCustomerBalanceByMobile(
  mobile: string
): Promise<{ found: false } | { found: true; name: string; surname: string; points_balance: number }> {
  const customer = await findCustomerByMobile(mobile);
  if (!customer) return { found: false };
  return { found: true, name: customer.name, surname: customer.surname, points_balance: customer.points_balance };
}

/**
 * Redeems an arbitrary number of points for cash-equivalent discount —
 * the flexible alternative to the fixed Rewards catalog. Staff in
 * app.globowaxmalta.com enters how many points a customer wants to use at
 * checkout; this validates the balance, debits the ledger, and returns
 * the €discount value so the payment total can be reduced by that amount
 * before the customer pays the rest.
 */
export async function redeemPointsForCash(input: {
  mobile: string;
  points: number;
}): Promise<{ discountValue: number; newBalance: number; customer: Customer }> {
  if (input.points <= 0) throw new Error("Points must be a positive number");

  const customer = await findCustomerByMobile(input.mobile);
  if (!customer) throw new Error("No Globowax Club account found for this mobile number");
  if (customer.points_balance < input.points) {
    throw new Error(`Insufficient points balance (has ${customer.points_balance}, requested ${input.points})`);
  }

  const newBalance = customer.points_balance - input.points;
  const { error: ledgerErr } = await db().from("points_ledger").insert({
    tenant_id: TENANT_ID,
    customer_id: customer.id,
    transaction_id: null,
    type: "redemption",
    points: -input.points,
    balance_after: newBalance,
  });
  if (ledgerErr) throw new Error(ledgerErr.message);

  await recalculateTier(customer.id, newBalance);

  const discountValue = Math.round((input.points / POINTS_PER_EURO) * 100) / 100;
  return { discountValue, newBalance, customer: { ...customer, points_balance: newBalance } };
}

/**
 * Looks up a customer by mobile number, tenant-wide — exact match first,
 * then falling back to digits-only comparison (same logic as
 * recordExternalTransaction) so a customer created by the
 * app.globowaxmalta.com webhook is found even if the phone format
 * differs slightly from what they type at signup.
 */
export async function findCustomerByMobile(mobile: string): Promise<Customer | undefined> {
  const client = db();
  const { data: exact } = await client.from("customers").select("*").eq("mobile", mobile).maybeSingle();
  if (exact) return exact as Customer;

  const { data: candidates } = await client.from("customers").select("*").eq("tenant_id", TENANT_ID);
  return (candidates ?? []).find((c) => phonesMatch(c.mobile, mobile)) as Customer | undefined;
}

/**
 * Links a Supabase Auth user to an existing customer row (rather than
 * creating a new one) — used when someone signs up with a phone number
 * that already has a Club account, e.g. from an earlier in-store visit
 * reported by the webhook. Keeps their accumulated points intact instead
 * of splitting them across two customer rows.
 */
export async function linkAuthUserToCustomer(customerId: string, authUserId: string): Promise<Customer> {
  const { data, error } = await db()
    .from("customers")
    .update({ auth_user_id: authUserId })
    .eq("id", customerId)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to link account");
  return data as Customer;
}

export async function registerCustomer(input: {
  name: string;
  surname: string;
  mobile: string;
  email: string | null;
  authUserId: string | null;
}): Promise<Customer> {
  const referralCode = `${input.name}${Math.floor(Math.random() * 900 + 100)}`.toUpperCase();

  const { data: customer, error } = await db()
    .from("customers")
    .insert({
      tenant_id: TENANT_ID,
      name: input.name,
      surname: input.surname,
      mobile: input.mobile,
      email: input.email,
      referral_code: referralCode,
      points_balance: 0,
      auth_user_id: input.authUserId,
    })
    .select()
    .single();
  if (error || !customer) throw new Error(error?.message ?? "Failed to register customer");

  const tiers = await getTiersDesc();
  const lowestTier = tiers[tiers.length - 1];
  if (lowestTier) {
    await db().from("customers").update({ tier_id: lowestTier.id }).eq("id", customer.id);
    customer.tier_id = lowestTier.id;
  }

  return customer as Customer;
}

export async function redeemReferral(input: {
  referralCode: string;
  newCustomer: { name: string; surname: string; mobile: string; email: string | null };
}): Promise<{ referral: Referral; newCustomer: Customer }> {
  const client = db();
  const { data: referrer } = await client
    .from("customers")
    .select("*")
    .eq("referral_code", input.referralCode)
    .maybeSingle();
  if (!referrer) throw new Error("Referral code not found");
  if (referrer.mobile === input.newCustomer.mobile) {
    throw new Error("A customer cannot redeem their own referral code");
  }

  const referralCode = `${input.newCustomer.name}${Math.floor(Math.random() * 900 + 100)}`.toUpperCase();
  const { data: newCustomer, error } = await client
    .from("customers")
    .insert({
      tenant_id: TENANT_ID,
      name: input.newCustomer.name,
      surname: input.newCustomer.surname,
      email: input.newCustomer.email,
      mobile: input.newCustomer.mobile,
      referral_code: referralCode,
      points_balance: 0,
    })
    .select()
    .single();
  if (error || !newCustomer) throw new Error(error?.message ?? "Failed to create customer");

  const tiers = await getTiersDesc();
  const lowestTier = tiers[tiers.length - 1];
  if (lowestTier) {
    await client.from("customers").update({ tier_id: lowestTier.id }).eq("id", newCustomer.id);
  }

  await awardPoints(referrer.id, REFERRAL_REWARD.referrer, "earning");
  await awardPoints(newCustomer.id, REFERRAL_REWARD.referred, "earning");

  const { data: referral, error: refErr } = await client
    .from("referrals")
    .insert({
      tenant_id: TENANT_ID,
      referrer_customer_id: referrer.id,
      referred_customer_id: newCustomer.id,
      referrer_points_awarded: REFERRAL_REWARD.referrer,
      referred_points_awarded: REFERRAL_REWARD.referred,
    })
    .select()
    .single();
  if (refErr || !referral) throw new Error(refErr?.message ?? "Failed to record referral");

  return { referral: referral as Referral, newCustomer: newCustomer as Customer };
}

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------

export async function listVouchersForCustomer(customerId: string): Promise<Voucher[]> {
  const { data, error } = await db().from("vouchers").select("*").eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Voucher[];
}

export async function redeemVoucher(input: { code: string; customerId: string }): Promise<Voucher> {
  const client = db();
  const { data: voucher, error } = await client.from("vouchers").select("*").eq("code", input.code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!voucher) throw new Error("Voucher not found");
  if (voucher.customer_id !== input.customerId) throw new Error("Voucher does not belong to this customer");
  if (voucher.used) throw new Error("Voucher already used");
  if (new Date(voucher.expiry) < new Date()) throw new Error("Voucher has expired");

  const { data: updated, error: updErr } = await client
    .from("vouchers")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", voucher.id)
    .select()
    .single();
  if (updErr || !updated) throw new Error(updErr?.message ?? "Failed to redeem voucher");
  return updated as Voucher;
}

// ---------------------------------------------------------------------------
// Campaigns / automation engine
// ---------------------------------------------------------------------------

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await db().from("campaigns").select("*").eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return (data ?? []) as Campaign[];
}

export async function listNotificationsForCustomer(customerId: string): Promise<Notification[]> {
  const { data, error } = await db()
    .from("notifications")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

async function hasFired(customerId: string, campaignId: string): Promise<boolean> {
  const { data } = await db()
    .from("automation_events")
    .select("id")
    .eq("customer_id", customerId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  return !!data;
}

function renderTemplate(body: string, customer: Customer, extra: Record<string, string> = {}) {
  return body
    .replaceAll("{{first_name}}", customer.name)
    .replaceAll("{{points}}", String(customer.points_balance))
    .replaceAll("{{tier}}", extra.tier ?? "")
    .replaceAll("{{voucher_code}}", extra.voucher_code ?? "");
}

async function fireCampaign(customerId: string, campaign: Campaign) {
  const client = db();
  await client.from("automation_events").insert({ tenant_id: TENANT_ID, customer_id: customerId, campaign_id: campaign.id });
  await client.from("notifications").insert({
    tenant_id: TENANT_ID,
    customer_id: customerId,
    campaign_id: campaign.id,
    message: campaign.action_config.message,
  });

  let voucherCode: string | undefined;
  if (campaign.action === "send_voucher" && campaign.action_config.discount_value) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    voucherCode = `GW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await client.from("vouchers").insert({
      tenant_id: TENANT_ID,
      customer_id: customerId,
      code: voucherCode,
      discount_type: campaign.action_config.discount_type ?? "fixed",
      value: campaign.action_config.discount_value,
      expiry: expiry.toISOString().slice(0, 10),
      qr_code: voucherCode,
    });
  } else if (campaign.action === "add_points" && campaign.action_config.points_value) {
    const { data: customer } = await client.from("customers").select("points_balance").eq("id", customerId).single();
    if (customer) {
      const newBalance = Number(customer.points_balance) + Number(campaign.action_config.points_value);
      await client.from("points_ledger").insert({
        tenant_id: TENANT_ID,
        customer_id: customerId,
        transaction_id: null,
        type: "earning",
        points: campaign.action_config.points_value,
        balance_after: newBalance,
      });
      await recalculateTier(customerId, newBalance);
    }
  }

  const channel = campaign.action_config.channel;
  if (channel) {
    const { data: customer } = await client.from("customers").select("*").eq("id", customerId).single();
    if (customer) {
      const tiers = await getTiersDesc();
      const tier = tiers.find((t) => customer.points_balance >= t.min_points);
      const body = renderTemplate(campaign.action_config.message, customer as Customer, {
        voucher_code: voucherCode ?? "",
        tier: tier?.name ?? "",
      });
      await sendMessage({ customerId, channel, body, campaignId: campaign.id });
    }
  }
}

/**
 * Evaluates every active campaign against every customer and fires the
 * ones whose condition is met and haven't already fired for that
 * customer (enforced at the DB level too, via the unique constraint on
 * automation_events). Exposed on-demand via POST /api/campaigns/run.
 */
export async function runAutomationEngine(): Promise<{ fired: number }> {
  const client = db();
  const { data: campaigns } = await client.from("campaigns").select("*").eq("tenant_id", TENANT_ID).eq("active", true);
  const { data: customers } = await client.from("customers").select("*").eq("tenant_id", TENANT_ID);

  let fired = 0;
  const now = Date.now();

  for (const campaign of (campaigns ?? []) as Campaign[]) {
    for (const customer of (customers ?? []) as Customer[]) {
      if (await hasFired(customer.id, campaign.id)) continue;

      const { data: txns } = await client
        .from("transactions")
        .select("id, created_at")
        .eq("customer_id", customer.id)
        .order("created_at");
      const transactions = txns ?? [];

      let matches = false;
      if (campaign.trigger === "inactive_30d") {
        const lastVisit = transactions.length
          ? Math.max(...transactions.map((t) => new Date(t.created_at).getTime()))
          : new Date(customer.created_at).getTime();
        matches = now - lastVisit >= campaign.trigger_value * 24 * 60 * 60 * 1000;
      } else if (campaign.trigger === "points_threshold") {
        matches = customer.points_balance >= campaign.trigger_value;
      } else if (campaign.trigger === "nth_visit") {
        matches = transactions.length === campaign.trigger_value;
      }

      if (matches) {
        await fireCampaign(customer.id, campaign);
        fired += 1;
      }
    }
  }

  return { fired };
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await db().from("message_templates").select("*").eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageTemplate[];
}

export async function listMessageLog(): Promise<MessageLogEntry[]> {
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageLogEntry[];
}

const providerFor: Record<MessageChannel, MessageProvider> = {
  whatsapp: whatsappProvider,
  sms: smsProvider,
  email: emailProvider,
};

const consentFieldFor: Record<MessageChannel, keyof Customer> = {
  whatsapp: "whatsapp_consent",
  sms: "sms_consent",
  email: "email_consent",
};

/**
 * Sends one message through the given channel's provider (mock today,
 * real adapter once connected — see lib/providers/) and always writes a
 * message log row, whether it went out, failed, or was blocked by the
 * customer's consent settings.
 */
export async function sendMessage(input: {
  customerId: string;
  channel: MessageChannel;
  body: string;
  templateId?: string;
  campaignId?: string;
}): Promise<MessageLogEntry> {
  const client = db();
  const { data: customer, error: custErr } = await client
    .from("customers")
    .select("*")
    .eq("id", input.customerId)
    .single();
  if (custErr || !customer) throw new Error("Customer not found");

  const hasConsent = customer[consentFieldFor[input.channel]] as boolean;
  const provider = providerFor[input.channel];

  let status: MessageLogEntry["status"] = "skipped_no_consent";
  if (hasConsent) {
    const result = await provider.send({ to: customer.mobile, body: input.body });
    status = result.ok ? "sent" : "failed";
  }

  const { data: entry, error } = await client
    .from("messages")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: customer.id,
      channel: input.channel,
      template_id: input.templateId ?? null,
      campaign_id: input.campaignId ?? null,
      body: input.body,
      status,
      provider: provider.name,
    })
    .select()
    .single();
  if (error || !entry) throw new Error(error?.message ?? "Failed to log message");

  if (status === "sent") {
    await recordTokenUsage(`${input.channel}_message` as TokenAction);
  }
  return entry as MessageLogEntry;
}

// ---------------------------------------------------------------------------
// Wallet passes
// ---------------------------------------------------------------------------

export async function listWalletPasses(customerId: string): Promise<WalletPass[]> {
  const { data, error } = await db().from("wallet_passes").select("*").eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as WalletPass[];
}

/**
 * Issues (or re-syncs) a wallet pass record for a customer. This is the
 * data side only — actual .pkpass signing (Apple) and Google Wallet JWT
 * issuance need real developer credentials; this is what they'll plug
 * into once connected.
 */
export async function issueWalletPass(customerId: string, provider: WalletPass["provider"]): Promise<WalletPass> {
  const client = db();
  const { data: customer } = await client.from("customers").select("id").eq("id", customerId).single();
  if (!customer) throw new Error("Customer not found");

  const { data: existing } = await client
    .from("wallet_passes")
    .select("*")
    .eq("customer_id", customerId)
    .eq("provider", provider)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await client
      .from("wallet_passes")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Failed to sync wallet pass");
    await recordTokenUsage("wallet_update");
    return updated as WalletPass;
  }

  const { data: pass, error } = await client
    .from("wallet_passes")
    .insert({
      tenant_id: TENANT_ID,
      customer_id: customerId,
      provider,
      serial_number: `GW-${provider.toUpperCase()}-${customerId}`,
    })
    .select()
    .single();
  if (error || !pass) throw new Error(error?.message ?? "Failed to issue wallet pass");
  await recordTokenUsage("wallet_update");
  return pass as WalletPass;
}

// ---------------------------------------------------------------------------
// Gift cards
// ---------------------------------------------------------------------------

export async function listGiftCardDenominations(): Promise<number[]> {
  return GIFT_CARD_DENOMINATIONS;
}

export async function listAllGiftCards(): Promise<GiftCard[]> {
  const { data, error } = await db()
    .from("gift_cards")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .order("sold_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GiftCard[];
}

export async function listGiftCardsForCustomer(customerId: string): Promise<GiftCard[]> {
  const { data, error } = await db().from("gift_cards").select("*").eq("recipient_customer_id", customerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as GiftCard[];
}

export async function sellGiftCard(input: {
  amount: number;
  purchaserName: string;
  recipientCustomerId: string | null;
}): Promise<GiftCard> {
  if (!GIFT_CARD_DENOMINATIONS.includes(input.amount)) {
    throw new Error(`Amount must be one of: ${GIFT_CARD_DENOMINATIONS.join(", ")}`);
  }
  const code = `GW-GIFT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data: card, error } = await db()
    .from("gift_cards")
    .insert({
      tenant_id: TENANT_ID,
      code,
      initial_value: input.amount,
      balance: input.amount,
      purchaser_name: input.purchaserName || "Walk-in",
      recipient_customer_id: input.recipientCustomerId,
      qr_code: code,
    })
    .select()
    .single();
  if (error || !card) throw new Error(error?.message ?? "Failed to issue gift card");
  return card as GiftCard;
}

export async function getGiftCardByCode(code: string): Promise<GiftCard | null> {
  const { data: card } = await db().from("gift_cards").select("*").eq("code", code).maybeSingle();
  return (card as GiftCard) ?? null;
}

export async function redeemGiftCard(input: { code: string; amount: number }): Promise<GiftCard> {
  const client = db();
  const { data: card, error } = await client.from("gift_cards").select("*").eq("code", input.code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!card) throw new Error("Gift card not found");
  if (input.amount <= 0) throw new Error("Amount must be positive");
  if (input.amount > Number(card.balance)) throw new Error("Amount exceeds remaining balance");

  const { data: updated, error: updErr } = await client
    .from("gift_cards")
    .update({ balance: Number(card.balance) - input.amount })
    .eq("id", card.id)
    .select()
    .single();
  if (updErr || !updated) throw new Error(updErr?.message ?? "Failed to redeem gift card");
  return updated as GiftCard;
}

// ---------------------------------------------------------------------------
// AI: insights, segments, suggestions
// ---------------------------------------------------------------------------

async function fetchTenantAnalyticsData() {
  const client = db();
  const [{ data: customers }, { data: transactions }, { data: items }, { data: services }] = await Promise.all([
    client.from("customers").select("*").eq("tenant_id", TENANT_ID),
    client.from("transactions").select("*").eq("tenant_id", TENANT_ID),
    client.from("transaction_items").select("*"),
    client.from("services").select("*").eq("tenant_id", TENANT_ID),
  ]);
  return {
    customers: (customers ?? []) as Customer[],
    transactions: (transactions ?? []) as Transaction[],
    items: (items ?? []) as TransactionItem[],
    services: services ?? [],
  };
}

export async function listCustomerInsights(): Promise<CustomerInsight[]> {
  const { customers, transactions, items } = await fetchTenantAnalyticsData();
  return customers.map((c) => computeCustomerInsight(c, transactions, items));
}

export async function getCustomerInsight(customerId: string): Promise<CustomerInsight | undefined> {
  const customer = await getCustomer(customerId);
  if (!customer) return undefined;
  const { transactions, items } = await fetchTenantAnalyticsData();
  return computeCustomerInsight(customer, transactions, items);
}

export async function listSegments(): Promise<CustomerSegment[]> {
  const { customers, transactions, items, services } = await fetchTenantAnalyticsData();
  const insights = new Map(customers.map((c) => [c.id, computeCustomerInsight(c, transactions, items)]));
  return computeSegments(customers, insights, services, transactions, items);
}

export async function listAISuggestions(): Promise<AISuggestion[]> {
  const segments = await listSegments();
  await recordTokenUsage("ai_analysis");
  return generateSuggestions(segments, TENANT_ID);
}

/**
 * Promotes an AI suggestion to a real, active campaign — the doc's
 * "[CREATE CAMPAIGN]" button. From this point on it's an ordinary
 * campaign the automation engine evaluates like any other.
 */
export async function createCampaignFromSuggestion(suggestionId: string): Promise<Campaign> {
  const suggestions = await listAISuggestions();
  const suggestion = suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found");

  const { data: campaign, error } = await db()
    .from("campaigns")
    .insert({
      tenant_id: TENANT_ID,
      name: suggestion.suggested_campaign.name,
      trigger: suggestion.suggested_campaign.trigger,
      trigger_value: suggestion.suggested_campaign.trigger_value,
      action: suggestion.suggested_campaign.action,
      action_config: suggestion.suggested_campaign.action_config,
      active: true,
    })
    .select()
    .single();
  if (error || !campaign) throw new Error(error?.message ?? "Failed to create campaign");
  return campaign as Campaign;
}

// ---------------------------------------------------------------------------
// Billing, usage tokens, multi-tenant (Super Admin)
// ---------------------------------------------------------------------------

export async function listTenants(): Promise<Tenant[]> {
  // Service-role client bypasses RLS, so this naturally returns every
  // tenant on the platform — exactly what Super Admin needs to see.
  const { data, error } = await db().from("tenants").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as Tenant[];
}

export async function getTenantBilling(tenantId: string = TENANT_ID): Promise<TenantBilling | undefined> {
  const { data, error } = await db().from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TenantBilling) ?? undefined;
}

export async function getTokenUsageSummary(tenantId: string = TENANT_ID) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("usage_tokens")
    .select("tokens")
    .eq("tenant_id", tenantId)
    .gte("created_at", thirtyDaysAgo);
  if (error) throw new Error(error.message);
  const used = (data ?? []).reduce((sum, t) => sum + Number(t.tokens), 0);
  const billing = await getTenantBilling(tenantId);
  return {
    used,
    limit: billing?.monthly_token_limit ?? 0,
    plan: billing?.plan ?? "starter",
  };
}

/**
 * Super Admin's cross-tenant view: every tenant with its plan and current
 * usage. Only one tenant exists today (Globowax Malta), but this is the
 * exact shape the platform-owner dashboard scales to once other car
 * washes are onboarded as separate tenants.
 */
export async function listTenantsWithUsage() {
  const tenants = await listTenants();
  const results = [];
  for (const t of tenants) {
    const billing = await getTenantBilling(t.id);
    const usage = await getTokenUsageSummary(t.id);
    const { count } = await db()
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", t.id);
    results.push({ tenant: t, billing, usage, customerCount: count ?? 0 });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const client = db();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: customers }, { data: todaysTxns }, { data: ledger30d }] = await Promise.all([
    client.from("customers").select("created_at").eq("tenant_id", TENANT_ID),
    client.from("transactions").select("total_amount, created_at").eq("tenant_id", TENANT_ID).gte("created_at", `${today}T00:00:00Z`),
    client.from("points_ledger").select("type, points, created_at").eq("tenant_id", TENANT_ID).gte("created_at", thirtyDaysAgo),
  ]);

  const pointsIssued = (ledger30d ?? [])
    .filter((p) => p.type === "earning")
    .reduce((sum, p) => sum + Number(p.points), 0);
  const pointsRedeemed = (ledger30d ?? [])
    .filter((p) => p.type === "redemption")
    .reduce((sum, p) => sum + Math.abs(Number(p.points)), 0);

  return {
    todays_revenue: (todaysTxns ?? []).reduce((sum, t) => sum + Number(t.total_amount), 0),
    todays_visits: (todaysTxns ?? []).length,
    new_customers_30d: (customers ?? []).filter((c) => c.created_at >= thirtyDaysAgo).length,
    returning_customers_30d: (customers ?? []).filter((c) => c.created_at < thirtyDaysAgo).length,
    points_issued_30d: pointsIssued,
    points_redeemed_30d: pointsRedeemed,
    active_customers: (customers ?? []).length,
  };
}

/**
 * Transaction history for the admin /admin/history page — today's summary
 * numbers are always "as of right now", but a business still needs to
 * look back at past days. Returns the last `days` days, each with total
 * revenue/visit count and the individual transactions (with the
 * customer's name joined in), most recent day first.
 */
export async function getTransactionHistory(days: number = 30): Promise<
  {
    date: string;
    revenue: number;
    visits: number;
    transactions: {
      id: string;
      created_at: string;
      total_amount: number;
      payment_method: string;
      customer_name: string;
    }[];
  }[]
> {
  const client = db();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: txns } = await client
    .from("transactions")
    .select("id, created_at, total_amount, payment_method, customers(name, surname)")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const byDay = new Map<string, { revenue: number; visits: number; transactions: any[] }>();
  for (const t of txns ?? []) {
    const day = t.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { revenue: 0, visits: 0, transactions: [] });
    const bucket = byDay.get(day)!;
    bucket.revenue += Number(t.total_amount);
    bucket.visits += 1;
    const customer = Array.isArray(t.customers) ? t.customers[0] : t.customers;
    bucket.transactions.push({
      id: t.id,
      created_at: t.created_at,
      total_amount: Number(t.total_amount),
      payment_method: t.payment_method,
      customer_name: customer ? `${customer.name} ${customer.surname}` : "Unknown",
    });
  }

  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, bucket]) => ({ date, ...bucket }));
}

/**
 * Same shape as one entry from getTransactionHistory, but for a single
 * specific calendar date (any day, not limited to the recent-days
 * window) — powers the History page's date picker.
 */
export async function getTransactionsForDate(date: string): Promise<{
  date: string;
  revenue: number;
  visits: number;
  transactions: {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    customer_name: string;
  }[];
}> {
  const client = db();
  const { data: txns } = await client
    .from("transactions")
    .select("id, created_at, total_amount, payment_method, customers(name, surname)")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", `${date}T00:00:00Z`)
    .lt("created_at", `${date}T23:59:59.999Z`)
    .order("created_at", { ascending: false });

  const transactions = (txns ?? []).map((t) => {
    const customer = Array.isArray(t.customers) ? t.customers[0] : t.customers;
    return {
      id: t.id,
      created_at: t.created_at,
      total_amount: Number(t.total_amount),
      payment_method: t.payment_method,
      customer_name: customer ? `${customer.name} ${customer.surname}` : "Unknown",
    };
  });

  return {
    date,
    revenue: transactions.reduce((s, t) => s + t.total_amount, 0),
    visits: transactions.length,
    transactions,
  };
}
