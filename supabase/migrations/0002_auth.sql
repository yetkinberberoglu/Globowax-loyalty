-- Links customers and staff to real Supabase Auth users.
-- Run this after 0001_init.sql (and after you've already been testing
-- with the seeded demo data — this migration is additive, nothing existing
-- breaks or needs re-seeding).

alter table customers add column auth_user_id uuid unique references auth.users(id) on delete set null;
alter table app_users add column auth_user_id uuid unique references auth.users(id) on delete set null;

create index on customers(auth_user_id);
create index on app_users(auth_user_id);

-- ---------------------------------------------------------------------
-- One-time setup: creating your own staff/admin login
--
-- There is deliberately no public "sign up as admin" page — you create
-- your first staff account by hand, once:
--
-- 1. Supabase Dashboard → Authentication → Users → Add user. Use your own
--    email + a password. Copy the new user's UUID (shown in the users list).
--
-- 2. Run this, swapping in that UUID and your email:
--
--    insert into app_users (tenant_id, role, email, full_name, auth_user_id)
--    values (
--      '11111111-1111-1111-1111-111111111111',
--      'tenant_admin',
--      'you@example.com',
--      'Your Name',
--      '<paste the auth user UUID here>'
--    );
--
-- After that you can log in at /admin/login with that email + password.
--
-- Customers don't need this manual step — they get linked automatically
-- the moment they sign up through /signup. The existing seeded demo
-- customers (John Smith, Maria Vella) are NOT linked to any login yet;
-- sign up as a fresh customer to test the /club flow end to end, or link
-- John Smith by hand the same way as above (into customers.auth_user_id
-- instead of app_users).
-- ---------------------------------------------------------------------
