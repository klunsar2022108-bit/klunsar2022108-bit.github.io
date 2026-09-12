-- Ordinary admins cannot deactivate or reactivate super-admin accounts.
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
  if public.is_super_admin(_user_id) and not public.is_super_admin() then
    raise exception 'Only a super admin can change a super admin account';
  end if;
  if _status not in ('active','deactivated') then raise exception 'Invalid account status'; end if;
  update public.profiles
  set account_status = _status,
      deactivated_at = case when _status = 'deactivated' then now() else null end,
      deactivation_reason = nullif(trim(_reason), '')
  where id = _user_id;
end; $$;
