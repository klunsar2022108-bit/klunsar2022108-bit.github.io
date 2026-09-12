-- Live Super Admin role management and password-reset request workflow.
create or replace function public.set_user_role(_user_id uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if _user_id = auth.uid() and _role <> 'super_admin' then raise exception 'You cannot remove your own Super Admin role'; end if;
  insert into public.user_roles (user_id, role) values (_user_id, _role) on conflict (user_id, role) do nothing;
  insert into public.admin_audit_events(actor_id, action, target_user_id, resource_type, details)
  values (auth.uid(), 'role_granted', _user_id, 'user_roles', jsonb_build_object('role', _role));
end; $$;

grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.password_reset_requests to authenticated;
grant all on public.password_reset_requests to service_role;
alter table public.password_reset_requests enable row level security;
create policy "super admins manage password reset requests" on public.password_reset_requests for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
