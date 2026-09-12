-- Confirmed business rules and configurable policy.
-- Decision: use tiered approvals. Admin approves routine operations; Super Admin approves roles,
-- permissions, account-state changes, financial policy, and high-risk financial adjustments.
-- Decision: customer and student accounts share auth.users but have separate account_type profiles.
-- Decision: programmes, services, and products use one unified cart and one payment ledger;
-- order_items.item_type preserves reporting separation.
-- Decision: teachers see payment status/period/approved amount only, never business profit,
-- expenditure, customer payment proofs, or other teachers' salary records.
-- Decision: in-app notifications are authoritative/audited; email is an optional delivery channel.

alter table public.profiles
  add column if not exists account_type text not null default 'student',
  add column if not exists financial_access text not null default 'none';

alter table public.order_items
  add column if not exists item_type text not null default 'product';

alter table public.orders
  add column if not exists cart_model text not null default 'unified',
  add column if not exists payment_scope text not null default 'full_cart';

alter table public.admin_audit_events
  add column if not exists approval_level text not null default 'admin';

alter table public.expenses
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

create table if not exists public.business_policies (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  requested_by uuid not null references auth.users(id) on delete cascade,
  admin_status text not null default 'pending',
  admin_reviewed_by uuid references auth.users(id) on delete set null,
  admin_reviewed_at timestamptz,
  super_admin_required boolean not null default false,
  super_admin_status text not null default 'not_required',
  super_admin_reviewed_by uuid references auth.users(id) on delete set null,
  super_admin_reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app','email')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, channel)
);

create table if not exists public.teacher_financial_summary (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  approved_amount numeric(12,2) not null default 0,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(teacher_user_id, period)
);

insert into public.business_policies (key, value, description) values
  ('approval_model', '{"routine":"admin","high_risk":"super_admin","dual_approval":false}', 'Routine work needs Admin approval; roles, permissions, account-state, financial-policy and high-risk adjustments need Super Admin approval.'::text),
  ('discount_formula', '{"line_discount":"line_subtotal * discount_percent / 100","discount_total":"sum(line_discount)","grand_total":"subtotal - discount_total"}', 'Discounts are calculated per line from the admin-controlled percentage.'::text),
  ('financial_formulas', '{"income":"approved order totals + approved retail sales","expenditure":"approved expenses","profit":"income - expenditure","balance_due":"max(order_total - amount_paid, 0)"}', 'Reporting formulas for income, expenditure, profit and balances.'::text),
  ('cart_model', '{"mode":"unified","item_types":["programme","product","service"],"payment":"shared_payment_ledger","individual_payment":"configured_per_item"}', 'One cart and payment ledger; item_type separates reporting.'::text),
  ('shift_rules', '{"student_request":"admin_review","teacher_reassignment":"admin_review","high_impact_reassignment":"super_admin_review"}', 'Students request changes; Admin reviews; Super Admin is reserved for high-impact reassignment.'::text),
  ('teacher_financial_visibility', '{"visible":["payment_status","period","approved_amount"],"restricted":["profit","expenses","customer_payment_proof","other_teacher_payments"]}', 'Teacher financial information policy.'::text),
  ('notification_policy', '{"authoritative_channel":"in_app","optional_channels":["email"],"audit":true}', 'In-app notifications are stored and authoritative; email can be enabled later.'::text)
on conflict (key) do nothing;

insert into public.approval_requests (action, resource_type, super_admin_required, requested_by)
select action, 'policy', action in ('role_change','permission_change','account_state_change','financial_policy_change'), u.user_id
from (values
  ('order_approval'), ('payment_approval'), ('registration_approval'), ('delivery_update'),
  ('role_change'), ('permission_change'), ('account_state_change'), ('financial_policy_change')
) as actions(action)
cross join lateral (select id as user_id from auth.users limit 1) u
where false;

insert into public.notification_channels (user_id, channel)
select id, 'in_app' from auth.users
on conflict (user_id, channel) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_role text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if requested_role not in ('customer', 'student', 'teacher') then requested_role := 'student'; end if;
  insert into public.profiles (id, full_name, username, phone, email, approval_status, account_type)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'username',''), nullif(new.raw_user_meta_data->>'phone',''), new.email, case when requested_role = 'customer' then 'approved' else 'pending' end, requested_role)
  on conflict (id) do update set email = excluded.email, account_type = excluded.account_type;
  insert into public.user_roles (user_id, role) values (new.id, requested_role::public.app_role) on conflict (user_id, role) do nothing;
  if lower(coalesce(new.email, '')) = 'klunsar@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;

grant select on public.business_policies to authenticated;
grant select, insert, update on public.approval_requests to authenticated;
grant select, insert, update on public.notification_channels to authenticated;
grant select on public.teacher_financial_summary to authenticated;
grant all on public.business_policies, public.approval_requests, public.notification_channels, public.teacher_financial_summary to service_role;

alter table public.business_policies enable row level security;
alter table public.approval_requests enable row level security;
alter table public.notification_channels enable row level security;
alter table public.teacher_financial_summary enable row level security;

create policy "authenticated read business policies" on public.business_policies for select to authenticated using (true);
create policy "super admins manage business policies" on public.business_policies for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "requesters and admins read approvals" on public.approval_requests for select to authenticated using (requested_by = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy "authenticated create approvals" on public.approval_requests for insert to authenticated with check (requested_by = auth.uid());
create policy "admins review routine approvals" on public.approval_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "super admins review elevated approvals" on public.approval_requests for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users manage own notification channels" on public.notification_channels for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users set own notification channels" on public.notification_channels for insert to authenticated with check (user_id = auth.uid());
create policy "users update own notification channels" on public.notification_channels for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "teachers read own financial summary" on public.teacher_financial_summary for select to authenticated
  using (teacher_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());

create or replace view public.financial_summary with (security_invoker = true) as
select
  coalesce((select sum(total) from public.orders where payment_status = 'approved'), 0)::numeric(12,2) +
  coalesce((select sum(total) from public.retail_sales), 0)::numeric(12,2) as income,
  coalesce((select sum(amount) from public.expenses where approval_status = 'approved'), 0)::numeric(12,2) as expenditure,
  (
    coalesce((select sum(total) from public.orders where payment_status = 'approved'), 0) +
    coalesce((select sum(total) from public.retail_sales), 0) -
    coalesce((select sum(amount) from public.expenses where approval_status = 'approved'), 0)
  )::numeric(12,2) as profit;

grant select on public.financial_summary to authenticated;
