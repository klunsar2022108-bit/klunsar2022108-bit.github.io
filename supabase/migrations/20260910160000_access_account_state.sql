-- Access and account-state enforcement.
alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivation_reason text;

create or replace function public.is_active_account(_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id
      and account_status = 'active'
      and (approval_status = 'approved' or exists (select 1 from public.user_roles ur where ur.user_id = _user_id and ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role)))
  )
$$;

grant execute on function public.is_active_account(uuid) to authenticated;

create or replace function public.is_super_admin(_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'super_admin'::public.app_role)
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;

create or replace function public.account_state(_user_id uuid)
returns table(account_status text, approval_status text)
language sql stable security definer set search_path = public as $$
  select p.account_status, p.approval_status from public.profiles p where p.id = _user_id
$$;

grant execute on function public.account_state(uuid) to authenticated;

-- Ordinary admins cannot change roles; super admins can.
drop policy if exists "admins manage roles" on public.user_roles;
create policy "super admins manage roles" on public.user_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Ordinary admins may manage profile/contact data, but account-state changes are super-admin-only.
drop policy if exists "own profile update" on public.profiles;
create policy "users update permitted profile fields" on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'))
  with check (
    auth.uid() = id
    or (
      public.has_role(auth.uid(),'admin')
      and account_status = (select s.account_status from public.account_state(public.profiles.id) s)
      and approval_status = (select s.approval_status from public.account_state(public.profiles.id) s)
    )
    or public.is_super_admin()
  );

-- Explicit administrative account-state operation, audited by timestamp/reason.
create or replace function public.set_account_state(
  _user_id uuid,
  _status text,
  _reason text default ''
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() and not public.has_role(auth.uid(),'admin') then
    raise exception 'Admin access required';
  end if;
  if _status not in ('active','deactivated') then raise exception 'Invalid account status'; end if;
  update public.profiles
  set account_status = _status,
      deactivated_at = case when _status = 'deactivated' then now() else null end,
      deactivation_reason = nullif(trim(_reason), '')
  where id = _user_id;
end; $$;

grant execute on function public.set_account_state(uuid, text, text) to authenticated;

-- High-level analytics and role management are super-admin-only resources.
create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.admin_audit_events to authenticated;
grant all on public.admin_audit_events to service_role;
alter table public.admin_audit_events enable row level security;
create policy "super admins read audit events" on public.admin_audit_events for select to authenticated using (public.is_super_admin());
create policy "admins write audit events" on public.admin_audit_events for insert to authenticated with check (actor_id = auth.uid() and public.has_role(auth.uid(),'admin'));
