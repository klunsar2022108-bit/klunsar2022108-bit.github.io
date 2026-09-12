-- Payment verification and balance fields for reusable order transactions.
alter table public.orders
  add column if not exists amount_paid numeric(12,2) not null default 0,
  add column if not exists balance_due numeric(12,2) not null default 0,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.order_payments
  add column if not exists expected_amount numeric(12,2),
  add column if not exists amount_paid numeric(12,2),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create or replace function public.sync_order_payment_balance()
returns trigger language plpgsql set search_path = public as $$
begin
  new.balance_due := greatest(coalesce(new.total, 0) - coalesce(new.amount_paid, 0), 0);
  return new;
end; $$;

drop trigger if exists sync_order_payment_balance on public.orders;
create trigger sync_order_payment_balance before insert or update of total, amount_paid on public.orders
for each row execute function public.sync_order_payment_balance();
