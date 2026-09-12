-- Platform expansion: facilities, lifecycle, financial accounts, support, CRM, procurement, budgets and branches.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(), name text not null, code text not null unique,
  address text not null default '', active boolean not null default true, created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists branch_id uuid references public.branches(id) on delete set null;

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(), branch_id uuid references public.branches(id) on delete set null,
  name text not null, facility_type text not null, capacity integer, status text not null default 'available',
  description text not null default '', maintenance_notes text not null default '', created_at timestamptz not null default now()
);

create table if not exists public.facility_equipment (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null, label text not null, quantity integer not null default 1
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(), facility_id uuid references public.facilities(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null, teacher_id uuid references public.tutors(id) on delete set null,
  title text not null, starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'scheduled', created_at timestamptz not null default now()
);

create table if not exists public.student_lifecycle_events (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id) on delete cascade,
  stage text not null, status text not null default 'active', notes text not null default '', actor_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.student_financial_accounts (
  id uuid primary key default gen_random_uuid(), student_id uuid not null unique references auth.users(id) on delete cascade,
  programme_fee numeric(12,2) not null default 0, amount_paid numeric(12,2) not null default 0, discount_total numeric(12,2) not null default 0,
  scholarship_amount numeric(12,2) not null default 0, balance_due numeric(12,2) not null default 0, payment_deadline date,
  updated_at timestamptz not null default now()
);

create table if not exists public.examination_attempts (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade, teacher_id uuid references public.tutors(id) on delete set null,
  marks numeric(8,2), grade text, feedback text not null default '', status text not null default 'submitted', submitted_at timestamptz, verified_by uuid references auth.users(id) on delete set null, verified_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.certificate_history (
  id uuid primary key default gen_random_uuid(), certificate_id uuid not null references public.certificates(id) on delete cascade,
  action text not null, actor_id uuid references auth.users(id) on delete set null, notes text not null default '', created_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  name text not null, email text, phone text, contact_type text not null default 'prospect', interested_programme text,
  stage text not null default 'enquiry', notes text not null default '', next_follow_up_at timestamptz, assigned_to uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), ticket_number text not null unique, requester_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, description text not null, priority text not null default 'normal', status text not null default 'open', assigned_to uuid references auth.users(id) on delete set null,
  resolution text, created_at timestamptz not null default now(), closed_at timestamptz
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade, message text not null, created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null, audience text not null default 'all',
  programme text, published boolean not null default false, published_at timestamptz, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, email text, phone text, address text, active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(), supplier_id uuid references public.suppliers(id) on delete set null, requested_by uuid not null references auth.users(id) on delete cascade,
  description text not null, amount numeric(12,2) not null default 0, status text not null default 'pending', approved_by uuid references auth.users(id) on delete set null, rejection_reason text, created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(), purchase_request_id uuid references public.purchase_requests(id) on delete set null, supplier_id uuid references public.suppliers(id) on delete set null,
  order_number text not null unique, total numeric(12,2) not null default 0, status text not null default 'issued', ordered_at timestamptz, received_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null, period_start date not null, period_end date not null,
  amount numeric(12,2) not null default 0, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, action text not null, resource_type text, resource_id uuid,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['branches','facilities','facility_equipment','class_sessions','student_lifecycle_events','student_financial_accounts','examination_attempts','certificate_history','crm_contacts','support_tickets','support_ticket_messages','announcements','suppliers','purchase_requests','purchase_orders','budgets','activity_events'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "authenticated read active facilities" on public.facilities for select to authenticated using (status <> 'retired' or public.has_role(auth.uid(),'admin'));
create policy "admins manage facilities" on public.facilities for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "users read own lifecycle" on public.student_lifecycle_events for select to authenticated using (student_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'teacher'));
create policy "admins manage lifecycle" on public.student_lifecycle_events for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "students read own financial account" on public.student_financial_accounts for select to authenticated using (student_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins manage student accounts" on public.student_financial_accounts for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "students read own exams" on public.examination_attempts for select to authenticated using (student_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'teacher'));
create policy "teachers submit exams" on public.examination_attempts for insert to authenticated with check (public.has_role(auth.uid(),'teacher'));
create policy "admins verify exams" on public.examination_attempts for update to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "users read own tickets" on public.support_tickets for select to authenticated using (requester_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users create tickets" on public.support_tickets for insert to authenticated with check (requester_id = auth.uid());
create policy "admins manage tickets" on public.support_tickets for update to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "users read ticket messages" on public.support_ticket_messages for select to authenticated using (sender_id = auth.uid() or exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.requester_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "users create ticket messages" on public.support_ticket_messages for insert to authenticated with check (sender_id = auth.uid());
create policy "admins manage announcements" on public.announcements for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "users read published announcements" on public.announcements for select to authenticated using (published = true or created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage procurement" on public.purchase_requests for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins manage suppliers" on public.suppliers for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins manage budgets" on public.budgets for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins read activity events" on public.activity_events for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());
