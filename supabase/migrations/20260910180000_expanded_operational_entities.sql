-- Expanded operational entities and controlled workflow transitions.

create table if not exists public.programme_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.programme_modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.programme_modules(id) on delete cascade,
  title text not null,
  assessment_type text not null default 'exam',
  pass_mark integer not null default 60,
  max_score integer not null default 100,
  scheduled_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.order_payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('opening','received','sale','adjustment','return')),
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  note text not null default '',
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.application_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  error_code text,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  route text,
  created_at timestamptz not null default now()
);

-- Payment proofs are kept in private storage when uploaded as files.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

create policy "users upload own payment proofs" on storage.objects for insert to authenticated
with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins read payment proofs" on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(),'admin'));
create policy "owners read own payment proofs" on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Status transitions are server-side and reject invalid jumps.
create or replace function public.transition_order_status(
  _order_id uuid,
  _next_status text,
  _reason text default ''
)
returns void language plpgsql security definer set search_path = public as $$
declare current_status text;
        actor uuid := auth.uid();
begin
  if not public.has_role(actor,'admin') and not public.has_role(actor,'super_admin') then raise exception 'Admin access required'; end if;
  select status into current_status from public.orders where id = _order_id for update;
  if current_status is null then raise exception 'Order not found'; end if;
  if _next_status not in ('pending','pending_approval','approved','processing','ready','shipped','out_for_delivery','delivered','completed','rejected','cancelled') then raise exception 'Invalid order status'; end if;
  if _next_status = 'rejected' and nullif(trim(_reason),'') is null then raise exception 'Rejection reason required'; end if;
  if current_status in ('completed','cancelled','rejected') and _next_status <> current_status then raise exception 'Finalized orders cannot be reopened'; end if;
  update public.orders set
    status = _next_status,
    rejection_reason = case when _next_status = 'rejected' then trim(_reason) else rejection_reason end,
    delivery_status = case when _next_status in ('processing','ready','shipped','out_for_delivery','delivered') then _next_status else delivery_status end,
    delivery_visible = _next_status in ('approved','processing','ready','shipped','out_for_delivery','delivered','completed')
  where id = _order_id;
end; $$;

grant execute on function public.transition_order_status(uuid, text, text) to authenticated;

create or replace function public.transition_payment_status(
  _payment_id uuid,
  _next_status text,
  _reason text default ''
)
returns void language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid();
        order_id_value uuid;
begin
  if not public.has_role(actor,'admin') and not public.has_role(actor,'super_admin') then raise exception 'Admin access required'; end if;
  if _next_status not in ('pending','under_review','approved','completed','rejected') then raise exception 'Invalid payment status'; end if;
  if _next_status = 'rejected' and nullif(trim(_reason),'') is null then raise exception 'Rejection reason required'; end if;
  select order_id into order_id_value from public.order_payments where id = _payment_id;
  if order_id_value is null then raise exception 'Payment not found'; end if;
  update public.order_payments set status = _next_status, rejection_reason = case when _next_status = 'rejected' then trim(_reason) else rejection_reason end, reviewed_by = actor, reviewed_at = now() where id = _payment_id;
  update public.orders set payment_status = _next_status, payment_reviewed_by = actor, payment_reviewed_at = now(), status = case when _next_status = 'approved' then 'approved' when _next_status = 'rejected' then 'rejected' else status end, rejection_reason = case when _next_status = 'rejected' then trim(_reason) else rejection_reason end where id = order_id_value;
end; $$;

grant execute on function public.transition_payment_status(uuid, text, text) to authenticated;

-- RLS for new entities.
do $$
declare t text;
begin
  foreach t in array array['programme_modules','lessons','assessments','invoices','refunds','stock_movements','expense_categories','application_errors'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "public read active academic structure" on public.programme_modules for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "admins manage academic structure" on public.programme_modules for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public read active lessons" on public.lessons for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "admins manage lessons" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "authenticated read assessments" on public.assessments for select to authenticated using (true);
create policy "admins manage assessments" on public.assessments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "users read own invoices" on public.invoices for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage invoices" on public.invoices for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "users read own refunds" on public.refunds for select to authenticated using (requested_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users request refunds" on public.refunds for insert to authenticated with check (requested_by = auth.uid());
create policy "admins manage refunds" on public.refunds for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage stock movements" on public.stock_movements for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage expense categories" on public.expense_categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins read errors" on public.application_errors for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "authenticated record errors" on public.application_errors for insert to authenticated with check (user_id = auth.uid() or user_id is null);

insert into public.expense_categories (name, description) values
  ('Staff and teacher payments', 'Salary and approved staff payments'),
  ('Utilities', 'Electricity, internet and water'),
  ('Supplies', 'Training and office supplies'),
  ('Delivery', 'Delivery and fulfilment costs'),
  ('Operations', 'Other approved operating costs')
on conflict (name) do nothing;
