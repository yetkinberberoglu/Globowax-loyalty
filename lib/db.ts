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

async function earnStamps(customerId: string, transactionId: string, serviceIds: string[]) {
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
  staffId: string;
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
 * Redeems a reward: debits the ledger (trigger updates the cached
 * balance), recalculates tier, and issues a redemption record with a
 * unique code.
 */
export async function redeemReward(input: {
  customerId: string;
  rewardId: string;
  staffId: string;
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

async function awardPoints(customerId: string, points: number, type: PointsLedgerEntry["type"]) {
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
