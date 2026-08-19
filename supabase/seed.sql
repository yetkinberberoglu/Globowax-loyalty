-- Seed data — mirrors lib/mock-data.ts so the app looks the same once
-- switched over to Supabase. Run after 0001_init.sql.

insert into tenants (id, name, slug, brand_color) values
  ('11111111-1111-1111-1111-111111111111', 'Globowax Malta', 'globowax-malta', '#2FBF71');

insert into loyalty_tiers (id, tenant_id, name, min_points, max_points, discount_pct) values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Silver', 0, 499, 0),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Gold', 500, 1499, 5),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Platinum', 1500, 2999, 10),
  ('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'VIP', 3000, null, 15);

insert into services (id, tenant_id, name, price, points_value, category, duration_minutes, active) values
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Maintenance Wash', 40, 40, 'wash', 45, true),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Interior Detailing', 180, 180, 'detailing', 180, true),
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Paint Correction', 350, 350, 'detailing', 300, true),
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Ceramic Coating', 750, 750, 'coating', 480, true),
  ('33333333-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Headlight Restoration', 50, 50, 'detailing', 60, true);

insert into rewards (id, tenant_id, name, type, points_cost, value, active) values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '€10 off', 'fixed_discount', 500, 10, true),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '€25 off', 'fixed_discount', 1000, 25, true),
  ('44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Free Maintenance Wash', 'free_service', 2000, 40, true);

insert into customers (id, tenant_id, name, surname, email, mobile, marketing_consent, whatsapp_consent, sms_consent, email_consent, referral_code, points_balance, tier_id, created_at) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'John', 'Smith', 'john.smith@example.com', '+35679000001', true, true, false, true, 'JOHN123', 1850, '22222222-0000-0000-0000-000000000003', '2025-03-14T09:00:00Z'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Maria', 'Vella', 'maria.vella@example.com', '+35679000002', true, false, true, true, 'MARIA456', 420, '22222222-0000-0000-0000-000000000001', '2025-05-02T09:00:00Z');

insert into vehicles (id, tenant_id, customer_id, reg_number, make, model, year, colour, fuel_type) values
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', 'ABC123', 'BMW', 'X5', 2022, 'Black', 'Diesel'),
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000002', 'XYZ456', 'Mercedes', 'C220', 2021, 'White', 'Diesel');

insert into transactions (id, tenant_id, customer_id, vehicle_id, total_amount, payment_method, created_at) values
  ('77777777-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 40, 'card', '2026-08-15T10:00:00Z');

insert into transaction_items (transaction_id, service_id, price, points_earned) values
  ('77777777-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 40, 40);

-- Note: inserting into points_ledger fires the trigger that syncs
-- customers.points_balance — so insert ledger rows AFTER the customer rows
-- above (which already set points_balance directly for the initial seed).
-- For John's seeded 1850 balance to stay consistent with a real ledger
-- trail, this one entry doesn't reconcile to 1850 — that's expected for
-- seed data; going forward every real transaction keeps them in sync.
insert into points_ledger (tenant_id, customer_id, transaction_id, type, points, balance_after, created_at) values
  ('11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'earning', 40, 1850, '2026-08-15T10:00:00Z');

insert into stamp_cards (id, tenant_id, customer_id, service_id, stamps_required, stamps_collected, created_at) values
  ('88888888-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 5, 3, '2025-03-14T09:00:00Z'),
  ('88888888-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 5, 0, '2025-05-02T09:00:00Z');

insert into gift_cards (tenant_id, code, initial_value, balance, purchaser_name, recipient_customer_id, qr_code, sold_at) values
  ('11111111-1111-1111-1111-111111111111', 'GW-GIFT-4Q7K', 100, 65, 'Anonymous walk-in', '55555555-0000-0000-0000-000000000001', 'GW-GIFT-4Q7K', '2026-07-01T10:00:00Z');

insert into campaigns (id, tenant_id, name, trigger, trigger_value, action, action_config, active) values
  ('99999999-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30-day win-back', 'inactive_30d', 30, 'send_voucher',
    '{"message":"We miss you — here''s €10 off your next wash.","discount_value":10,"discount_type":"fixed","channel":"whatsapp"}', true),
  ('99999999-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Close to a reward', 'points_threshold', 900, 'send_notification',
    '{"message":"You''re close to your next reward — keep going!","channel":"whatsapp"}', true),
  ('99999999-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '5th visit thank-you', 'nth_visit', 5, 'send_notification',
    '{"message":"Thanks for your 5th visit — a small reward is waiting on your next wash.","channel":"email"}', true);

insert into message_templates (tenant_id, name, channel, subject, body, active) values
  ('11111111-1111-1111-1111-111111111111', '30-day win-back', 'whatsapp', null, 'Hi {{first_name}}, we haven''t seen you at Globowax for a while. Here''s {{voucher_code}} for €10 off your next wash.', true),
  ('11111111-1111-1111-1111-111111111111', 'Points reminder', 'whatsapp', null, 'Hi {{first_name}}, you have {{points}} points. You''re close to unlocking your next reward.', true),
  ('11111111-1111-1111-1111-111111111111', 'Tier upgrade', 'email', 'You''ve reached {{tier}}!', 'Congratulations {{first_name}} — you''ve reached {{tier}} status at Globowax Club.', true);

insert into subscriptions (tenant_id, plan, monthly_token_limit, status) values
  ('11111111-1111-1111-1111-111111111111', 'starter', 2000, 'active');
