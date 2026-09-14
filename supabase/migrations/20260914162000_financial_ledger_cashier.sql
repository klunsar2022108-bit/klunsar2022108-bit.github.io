create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  entry_type text not null,
  debit numeric(12,2) not null default 0 check (debit >= 0),
  credit numeric(12,2) not null default 0 check (credit >= 0),
  source_table text,
  source_id uuid,
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cashier_sessions (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0,
  cash_sales numeric(12,2) not null default 0,
  refunds numeric(12,2) not null default 0,
  expenses numeric(12,2) not null default 0,
  expected_closing_cash numeric(12,2) not null default 0,
  actual_closing_cash numeric(12,2),
  difference numeric(12,2),
  status text not null default 'open'
);

grant select, insert, update on public.ledger_entries, public.cashier_sessions to authenticated;
alter table public.ledger_entries enable row level security;
alter table public.cashier_sessions enable row level security;

create policy "admins read ledger" on public.ledger_entries for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins append ledger" on public.ledger_entries for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "cashiers read own sessions" on public.cashier_sessions for select to authenticated using (cashier_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "cashiers manage own open sessions" on public.cashier_sessions for insert to authenticated with check (cashier_id = auth.uid());
create policy "admins close sessions" on public.cashier_sessions for update to authenticated using (cashier_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (cashier_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
