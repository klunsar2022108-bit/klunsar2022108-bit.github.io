-- Admin operations: teacher compensation, physical sales, notifications and audit-friendly allocations.
alter table public.enrollments
  add column if not exists teacher_id uuid references public.tutors(id) on delete set null;

create table if not exists public.teacher_payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.tutors(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  period text not null,
  status text not null default 'pending',
  notes text not null default '',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.retail_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  staff_user_id uuid references auth.users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'general',
  read_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['teacher_payments','retail_sales','user_notifications'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create policy "users read own notifications" on public.user_notifications
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
