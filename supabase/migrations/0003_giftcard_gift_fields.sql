alter table gift_cards add column if not exists from_name text;
alter table gift_cards add column if not exists to_name text;
alter table gift_cards add column if not exists valid_for_service text; -- null = all services
