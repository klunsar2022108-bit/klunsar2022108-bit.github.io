-- Remaining supporting entities from the expanded database design.
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_hash text not null,
  user_agent text,
  ip_address inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.order_payments(id) on delete set null,
  amount numeric(12,2) not null default 0,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  document_path text
);

grant select, insert, update on public.user_sessions to authenticated;
grant select, insert on public.receipts to authenticated;
grant all on public.user_sessions, public.receipts to service_role;
alter table public.user_sessions enable row level security;
alter table public.receipts enable row level security;

create policy "users manage own sessions" on public.user_sessions for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy "users create own sessions" on public.user_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "users revoke own sessions" on public.user_sessions for update to authenticated using (user_id = auth.uid() or public.is_super_admin()) with check (user_id = auth.uid() or public.is_super_admin());

create policy "users read own receipts" on public.receipts for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins issue receipts" on public.receipts for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
