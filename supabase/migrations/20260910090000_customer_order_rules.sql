-- Customer order, payment, inventory and delivery rules.
alter table public.products
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists stock_quantity integer,
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists allow_individual_payment boolean not null default true;

alter table public.orders
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists discount_total numeric(12,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'not_submitted',
  add column if not exists payment_proof text,
  add column if not exists payment_reference text,
  add column if not exists rejection_reason text,
  add column if not exists delivery_address text,
  add column if not exists delivery_status text,
  add column if not exists delivery_visible boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.order_items
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists attributes jsonb not null default '{}'::jsonb;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  method text not null,
  status text not null default 'pending',
  proof text,
  reference text,
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert on public.order_payments to authenticated;
grant all on public.order_payments to service_role;
alter table public.order_payments enable row level security;
create policy "customers read own payments" on public.order_payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "customers create own payments" on public.order_payments for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins manage payments" on public.order_payments for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.sync_order_delivery_visibility()
returns trigger language plpgsql set search_path = public as $$
begin
  new.delivery_visible := new.status in ('approved', 'processing', 'ready', 'shipped', 'out_for_delivery', 'delivered');
  if not new.delivery_visible then new.delivery_status := null; end if;
  return new;
end; $$;

drop trigger if exists sync_order_delivery_visibility on public.orders;
create trigger sync_order_delivery_visibility before insert or update of status on public.orders
for each row execute function public.sync_order_delivery_visibility();

create or replace function public.notify_low_stock()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stock_quantity is not null and new.stock_quantity <= new.low_stock_threshold then
    perform pg_notify('low_stock', json_build_object('product_id', new.id, 'name', new.name, 'stock', new.stock_quantity)::text);
  end if;
  return new;
end; $$;

drop trigger if exists notify_product_low_stock on public.products;
create trigger notify_product_low_stock after insert or update of stock_quantity on public.products
for each row execute function public.notify_low_stock();
