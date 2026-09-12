-- Delivery address, expected delivery and auditable status history.
alter table public.orders
  add column if not exists expected_delivery_at date;

create table if not exists public.order_delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select on public.order_delivery_events to authenticated;
grant insert on public.order_delivery_events to authenticated;
grant all on public.order_delivery_events to service_role;
alter table public.order_delivery_events enable row level security;
create policy "customers read own delivery history" on public.order_delivery_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "admins record delivery history" on public.order_delivery_events for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
