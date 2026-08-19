// Phase 1 domain types — mirror the agreed Postgres schema 1:1 so the
// swap from mock-data.ts to Supabase queries later is a pure data-layer change.

export type Role = "super_admin" | "tenant_admin" | "staff" | "customer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  tenant_id: string;
  role: Role;
  email: string;
  full_name: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  surname: string;
  email: string | null;
  mobile: string;
  dob: string | null;
  marketing_consent: boolean;
  whatsapp_consent: boolean;
  sms_consent: boolean;
  email_consent: boolean;
  referral_code: string;
  points_balance: number; // cached — always derived from points_ledger
  tier_id: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  customer_id: string;
  reg_number: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  fuel_type: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  points_value: number;
  category: string;
  duration_minutes: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  vehicle_id: string | null;
  staff_id: string;
  total_amount: number;
  payment_method: "card" | "cash" | "other";
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  service_id: string;
  price: number;
  points_earned: number;
}

export type LedgerEntryType =
  | "earning"
  | "redemption"
  | "adjustment"
  | "expiration"
  | "refund";

export interface PointsLedgerEntry {
  id: string;
  tenant_id: string;
  customer_id: string;
  transaction_id: string | null;
  type: LedgerEntryType;
  points: number; // positive for earning, negative for redemption/expiration
  balance_after: number;
  created_at: string;
}

export interface LoyaltyTier {
  id: string;
  tenant_id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  discount_pct: number;
}

export interface Reward {
  id: string;
  tenant_id: string;
  name: string;
  type: "fixed_discount" | "percentage_discount" | "free_service" | "voucher";
  points_cost: number;
  value: number;
  active: boolean;
}

export interface RewardRedemption {
  id: string;
  tenant_id: string;
  customer_id: string;
  reward_id: string;
  code: string;
  qr_code: string;
  redeemed_at: string;
  staff_id: string;
}

export interface StampCard {
  id: string;
  tenant_id: string;
  customer_id: string;
  service_id: string; // the service this card tracks, e.g. Maintenance Wash
  stamps_required: number;
  stamps_collected: number; // resets to 0 after redemption
  created_at: string;
}

export interface StampTransaction {
  id: string;
  tenant_id: string;
  stamp_card_id: string;
  transaction_id: string | null; // null for a free-wash redemption stamp reset
  type: "stamp_earned" | "card_redeemed";
  created_at: string;
}

export interface Referral {
  id: string;
  tenant_id: string;
  referrer_customer_id: string;
  referred_customer_id: string;
  referrer_points_awarded: number;
  referred_points_awarded: number;
  created_at: string;
}

export interface Voucher {
  id: string;
  tenant_id: string;
  customer_id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  value: number;
  expiry: string; // ISO date
  used: boolean;
  used_at: string | null;
  qr_code: string;
  created_at: string;
}

export type CampaignTrigger =
  | "inactive_30d"
  | "birthday"
  | "spend_threshold"
  | "points_threshold"
  | "nth_visit";

export type CampaignAction = "send_voucher" | "send_notification";

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  trigger: CampaignTrigger;
  trigger_value: number; // days / euros / points / visit count, depending on trigger
  action: CampaignAction;
  action_config: {
    message: string;
    discount_value?: number;
    discount_type?: "fixed" | "percentage";
    channel?: MessageChannel;
  };
  active: boolean;
}

export interface AutomationEvent {
  id: string;
  tenant_id: string;
  customer_id: string;
  campaign_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  customer_id: string;
  campaign_id: string | null;
  message: string;
  created_at: string;
  read: boolean;
}

export type MessageChannel = "whatsapp" | "sms" | "email";

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  channel: MessageChannel;
  subject: string | null; // email only
  body: string; // supports {{first_name}}, {{points}}, {{tier}}, {{voucher_code}}
  active: boolean;
}

export type MessageStatus = "sent" | "failed" | "skipped_no_consent";

export interface MessageLogEntry {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: MessageChannel;
  template_id: string | null;
  campaign_id: string | null;
  body: string;
  status: MessageStatus;
  provider: string; // e.g. "mock", "twilio", "resend", "whatsapp_cloud_api"
  created_at: string;
}

export type WalletProvider = "apple" | "google";

export interface WalletPass {
  id: string;
  tenant_id: string;
  customer_id: string;
  provider: WalletProvider;
  serial_number: string;
  last_synced_at: string;
  // Phase 3: pass content is generated and kept in sync with tier/points;
  // actual .pkpass signing (Apple) / JWT issuance (Google) needs real
  // developer credentials, added when those accounts are connected.
}

export interface GiftCard {
  id: string;
  tenant_id: string;
  code: string;
  initial_value: number;
  balance: number; // decrements with partial or full redemption
  purchaser_name: string | null; // in-store sale, may not be a registered customer
  recipient_customer_id: string | null; // linked once assigned/redeemed to a customer's account
  qr_code: string;
  sold_at: string;
}

export type ChurnRisk = "low" | "medium" | "high";

export interface CustomerInsight {
  customer_id: string;
  churn_risk: ChurnRisk;
  lifetime_value: number;
  avg_days_between_visits: number | null;
  predicted_next_visit_days: number | null;
  likely_next_service_id: string | null;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  customer_ids: string[];
}

export interface AISuggestion {
  id: string;
  tenant_id: string;
  segment_id: string;
  headline: string; // e.g. "42 customers haven't visited in 30 days"
  recommended_action: string; // e.g. "Send them a €10 comeback offer"
  suggested_campaign: {
    name: string;
    trigger: CampaignTrigger;
    trigger_value: number;
    action: CampaignAction;
    action_config: Campaign["action_config"];
  };
  created_at: string;
}

export type BillingPlan = "starter" | "scale" | "pro";

export interface TenantBilling {
  tenant_id: string;
  plan: BillingPlan;
  monthly_token_limit: number;
  status: "active" | "past_due" | "canceled";
}

export type TokenAction =
  | "loyalty_transaction"
  | "whatsapp_message"
  | "sms_message"
  | "email_message"
  | "ai_analysis"
  | "wallet_update";

export interface TokenUsageEntry {
  id: string;
  tenant_id: string;
  action: TokenAction;
  tokens: number;
  created_at: string;
}

export interface DashboardSummary {
  todays_revenue: number;
  todays_visits: number;
  new_customers_30d: number;
  returning_customers_30d: number;
  points_issued_30d: number;
  points_redeemed_30d: number;
  active_customers: number;
}
