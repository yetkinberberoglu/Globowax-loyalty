import type {
  Tenant,
  Customer,
  Vehicle,
  Service,
  Transaction,
  TransactionItem,
  PointsLedgerEntry,
  LoyaltyTier,
  Reward,
  StampCard,
  StampTransaction,
  Referral,
  Voucher,
  Campaign,
  AutomationEvent,
  Notification,
  MessageTemplate,
  MessageLogEntry,
  WalletPass,
  GiftCard,
  TenantBilling,
  TokenUsageEntry,
} from "./types";

// This file plays the role Supabase will play from Phase 1.5 onward.
// Every function here has a 1:1 shape with the query it will become —
// see lib/db.ts for the swap point.

export const tenant: Tenant = {
  id: "t_globowax_malta",
  name: "Globowax Malta",
  slug: "globowax-malta",
  brand_color: "#2FBF71",
  created_at: "2025-01-01T00:00:00Z",
};

export const tiers: LoyaltyTier[] = [
  { id: "tier_silver", tenant_id: tenant.id, name: "Silver", min_points: 0, max_points: 499, discount_pct: 0 },
  { id: "tier_gold", tenant_id: tenant.id, name: "Gold", min_points: 500, max_points: 1499, discount_pct: 5 },
  { id: "tier_platinum", tenant_id: tenant.id, name: "Platinum", min_points: 1500, max_points: 2999, discount_pct: 10 },
  { id: "tier_vip", tenant_id: tenant.id, name: "VIP", min_points: 3000, max_points: null, discount_pct: 15 },
];

export const services: Service[] = [
  { id: "svc_maintenance", tenant_id: tenant.id, name: "Maintenance Wash", price: 40, points_value: 40, category: "wash", duration_minutes: 45, active: true },
  { id: "svc_interior", tenant_id: tenant.id, name: "Interior Detailing", price: 180, points_value: 180, category: "detailing", duration_minutes: 180, active: true },
  { id: "svc_paint", tenant_id: tenant.id, name: "Paint Correction", price: 350, points_value: 350, category: "detailing", duration_minutes: 300, active: true },
  { id: "svc_ceramic", tenant_id: tenant.id, name: "Ceramic Coating", price: 750, points_value: 750, category: "coating", duration_minutes: 480, active: true },
  { id: "svc_headlight", tenant_id: tenant.id, name: "Headlight Restoration", price: 50, points_value: 50, category: "detailing", duration_minutes: 60, active: true },
];

export const rewards: Reward[] = [
  { id: "rwd_10", tenant_id: tenant.id, name: "€10 off", type: "fixed_discount", points_cost: 500, value: 10, active: true },
  { id: "rwd_25", tenant_id: tenant.id, name: "€25 off", type: "fixed_discount", points_cost: 1000, value: 25, active: true },
  { id: "rwd_free_wash", tenant_id: tenant.id, name: "Free Maintenance Wash", type: "free_service", points_cost: 2000, value: 40, active: true },
];

// Phase 2: one stamp program per tenant for now — admin-configurable count,
// tied to a specific service. "Buy 5 Maintenance Washes, get the 5th free."
export const stampCardConfig = {
  service_id: "svc_maintenance",
  stamps_required: 5,
};

export const stampCards: StampCard[] = [
  {
    id: "sc_cus_001",
    tenant_id: "t_globowax_malta",
    customer_id: "cus_001",
    service_id: stampCardConfig.service_id,
    stamps_required: stampCardConfig.stamps_required,
    stamps_collected: 3,
    created_at: "2025-03-14T09:00:00Z",
  },
  {
    id: "sc_cus_002",
    tenant_id: "t_globowax_malta",
    customer_id: "cus_002",
    service_id: stampCardConfig.service_id,
    stamps_required: stampCardConfig.stamps_required,
    stamps_collected: 0,
    created_at: "2025-05-02T09:00:00Z",
  },
];

// Phase 6: the platform is multi-tenant by design even though only one
// tenant exists today. `tenants` is what Super Admin lists; `tenant`
// above stays as the "current tenant" convenience export everything else
// already depends on, and is just tenants[0] for now.
export const tenants: Tenant[] = [tenant];

export const tenantBilling: TenantBilling[] = [
  { tenant_id: tenant.id, plan: "starter", monthly_token_limit: 2000, status: "active" },
];

export const tokenCosts: Record<string, number> = {
  loyalty_transaction: 1,
  whatsapp_message: 1,
  sms_message: 1,
  email_message: 1,
  ai_analysis: 5,
  wallet_update: 1,
};

export const tokenUsage: TokenUsageEntry[] = [];

export const stampTransactions: StampTransaction[] = [];

export const referralRewardConfig = {
  referrer_points: 500,
  referred_points: 250,
};

export const referrals: Referral[] = [];

// Phase 2: a handful of the doc's own examples, wired to the automation
// engine in db.ts. Admin can only toggle `active` for now — full rule
// authoring (Phase 6+ style admin UI) is out of scope here.
export const campaigns: Campaign[] = [
  {
    id: "camp_winback_30d",
    tenant_id: "t_globowax_malta",
    name: "30-day win-back",
    trigger: "inactive_30d",
    trigger_value: 30,
    action: "send_voucher",
    action_config: { message: "We miss you — here's €10 off your next wash.", discount_value: 10, discount_type: "fixed", channel: "whatsapp" },
    active: true,
  },
  {
    id: "camp_points_reminder",
    tenant_id: "t_globowax_malta",
    name: "Close to a reward",
    trigger: "points_threshold",
    trigger_value: 900,
    action: "send_notification",
    action_config: { message: "You're close to your next reward — keep going!", channel: "whatsapp" },
    active: true,
  },
  {
    id: "camp_5th_visit",
    tenant_id: "t_globowax_malta",
    name: "5th visit thank-you",
    trigger: "nth_visit",
    trigger_value: 5,
    action: "send_notification",
    action_config: { message: "Thanks for your 5th visit — a small reward is waiting on your next wash.", channel: "email" },
    active: true,
  },
];

export const automationEvents: AutomationEvent[] = [];
export const notifications: Notification[] = [];

export const messageTemplates: MessageTemplate[] = [
  {
    id: "tpl_winback",
    tenant_id: "t_globowax_malta",
    name: "30-day win-back",
    channel: "whatsapp",
    subject: null,
    body: "Hi {{first_name}}, we haven't seen you at Globowax for a while. Here's {{voucher_code}} for €10 off your next wash.",
    active: true,
  },
  {
    id: "tpl_points_reminder",
    tenant_id: "t_globowax_malta",
    name: "Points reminder",
    channel: "whatsapp",
    subject: null,
    body: "Hi {{first_name}}, you have {{points}} points. You're close to unlocking your next reward.",
    active: true,
  },
  {
    id: "tpl_tier_upgrade",
    tenant_id: "t_globowax_malta",
    name: "Tier upgrade",
    channel: "email",
    subject: "You've reached {{tier}}!",
    body: "Congratulations {{first_name}} — you've reached {{tier}} status at Globowax Club.",
    active: true,
  },
];

export const messageLog: MessageLogEntry[] = [];

export const walletPasses: WalletPass[] = [];

// Phase 4: in-store only — no Stripe, no online purchase. Staff sells a
// physical card for one of these fixed amounts and records it here.
export const giftCardDenominations = [50, 100, 250, 500];

export const giftCards: GiftCard[] = [
  {
    id: "gc_001",
    tenant_id: "t_globowax_malta",
    code: "GW-GIFT-4Q7K",
    initial_value: 100,
    balance: 65,
    purchaser_name: "Anonymous walk-in",
    recipient_customer_id: "cus_001",
    qr_code: "GW-GIFT-4Q7K",
    sold_at: "2026-07-01T10:00:00Z",
  },
];

export const vouchers: Voucher[] = [
  {
    id: "v_001",
    tenant_id: "t_globowax_malta",
    customer_id: "cus_001",
    code: "GW-8F4K92",
    discount_type: "fixed",
    value: 20,
    expiry: "2026-09-30",
    used: false,
    used_at: null,
    qr_code: "GW-8F4K92",
    created_at: "2026-08-01T09:00:00Z",
  },
];

export const customers: Customer[] = [
  {
    id: "cus_001", tenant_id: tenant.id, name: "John", surname: "Smith",
    email: "john.smith@example.com", mobile: "+35679000001", dob: null,
    marketing_consent: true, whatsapp_consent: true, sms_consent: false, email_consent: true,
    referral_code: "JOHN123", points_balance: 1850, tier_id: "tier_platinum",
    created_at: "2025-03-14T09:00:00Z",
  },
  {
    id: "cus_002", tenant_id: tenant.id, name: "Maria", surname: "Vella",
    email: "maria.vella@example.com", mobile: "+35679000002", dob: null,
    marketing_consent: true, whatsapp_consent: false, sms_consent: true, email_consent: true,
    referral_code: "MARIA456", points_balance: 420, tier_id: "tier_silver",
    created_at: "2025-05-02T09:00:00Z",
  },
];

export const vehicles: Vehicle[] = [
  { id: "veh_001", tenant_id: tenant.id, customer_id: "cus_001", reg_number: "ABC123", make: "BMW", model: "X5", year: 2022, colour: "Black", fuel_type: "Diesel" },
  { id: "veh_002", tenant_id: tenant.id, customer_id: "cus_002", reg_number: "XYZ456", make: "Mercedes", model: "C220", year: 2021, colour: "White", fuel_type: "Diesel" },
];

export const transactions: Transaction[] = [
  { id: "txn_001", tenant_id: tenant.id, customer_id: "cus_001", vehicle_id: "veh_001", staff_id: "staff_001", total_amount: 40, payment_method: "card", created_at: "2026-08-15T10:00:00Z" },
];

export const transactionItems: TransactionItem[] = [
  { id: "ti_001", transaction_id: "txn_001", service_id: "svc_maintenance", price: 40, points_earned: 40 },
];

export const pointsLedger: PointsLedgerEntry[] = [
  { id: "pl_001", tenant_id: tenant.id, customer_id: "cus_001", transaction_id: "txn_001", type: "earning", points: 40, balance_after: 1850, created_at: "2026-08-15T10:00:00Z" },
];
