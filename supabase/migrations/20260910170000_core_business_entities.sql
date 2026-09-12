-- Core business entities not represented as dedicated tables yet.

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text,
  billing_address text not null default '',
  preferred_payment_method text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  student_number text unique,
  date_of_birth date,
  emergency_contact text,
  emergency_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  action text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (role, action)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  details text not null default '',
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists service_id uuid references public.services(id) on delete set null;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  payment_method text,
  receipt_reference text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS and grants.
grant select, insert, update on public.customer_profiles to authenticated;
grant select, insert, update on public.student_profiles to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.services to anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.customer_profiles, public.student_profiles, public.role_permissions, public.services, public.expenses to service_role;

alter table public.customer_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.services enable row level security;
alter table public.expenses enable row level security;

create policy "customers read own profile" on public.customer_profiles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "customers manage own profile" on public.customer_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "customers update own profile" on public.customer_profiles for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "students read own profile" on public.student_profiles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'teacher'));
create policy "students create own profile" on public.student_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "students update own profile" on public.student_profiles for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "authenticated read role permissions" on public.role_permissions for select to authenticated using (true);
create policy "super admins manage role permissions" on public.role_permissions for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "public read active services" on public.services for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "admins manage services" on public.services for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admins manage expenses" on public.expenses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger customer_profiles_updated before update on public.customer_profiles for each row execute function public.set_updated_at();
create trigger student_profiles_updated before update on public.student_profiles for each row execute function public.set_updated_at();
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();

-- Default permissions are data, so super admins can extend them without a code migration.
insert into public.role_permissions (role, action, description) values
  ('customer', 'place_order', 'Create orders and submit payments'),
  ('customer', 'view_own_orders', 'View own order and delivery history'),
  ('student', 'view_academics', 'View approved programme progress and results'),
  ('student', 'request_shift_change', 'Submit a shift-change request'),
  ('teacher', 'submit_results', 'Submit academic results for review'),
  ('teacher', 'message_assigned_students', 'Message assigned students'),
  ('admin', 'approve_orders', 'Approve or reject orders and payments'),
  ('admin', 'manage_catalogue', 'Manage products, services and prices'),
  ('super_admin', 'manage_roles', 'Manage roles and permissions'),
  ('super_admin', 'view_high_level_analytics', 'View high-level business analytics')
on conflict (role, action) do nothing;

-- Reporting views for dashboards and audits.
create or replace view public.order_sales_analytics with (security_invoker = true) as
select
  count(*)::integer as order_count,
  coalesce(sum(total), 0)::numeric(12,2) as gross_revenue,
  coalesce(sum(case when payment_status = 'approved' then total else 0 end), 0)::numeric(12,2) as approved_revenue,
  count(*) filter (where status in ('pending', 'pending_approval'))::integer as pending_orders,
  count(*) filter (where status = 'rejected')::integer as rejected_orders
from public.orders;

create or replace view public.product_stock_analytics with (security_invoker = true) as
select id, name, category, price, stock_quantity, low_stock_threshold,
  case when stock_quantity is not null and stock_quantity <= low_stock_threshold then true else false end as is_low_stock
from public.products
where active = true;

create or replace view public.teacher_workload_analytics with (security_invoker = true) as
select teacher_id, programme, shift_id, count(*)::integer as assigned_students
from public.teacher_assignments
where status = 'active'
group by teacher_id, programme, shift_id;

grant select on public.order_sales_analytics, public.product_stock_analytics, public.teacher_workload_analytics to authenticated;
