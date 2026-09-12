-- Harden signup trigger for Auth Admin user creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare requested_role text := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
        selected_account_type text;
        selected_approval text;
begin
  if coalesce(new.raw_user_meta_data->>'seed_account', 'false') = 'true' then
    return new;
  end if;
  if requested_role not in ('customer', 'student', 'teacher') then requested_role := 'student'; end if;
  selected_account_type := requested_role;
  selected_approval := case when requested_role = 'customer' then 'approved' else 'pending' end;

  insert into public.profiles (id, full_name, phone, email, approval_status, account_type, account_status)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'phone', ''), new.email, selected_approval, selected_account_type, 'active')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    account_type = excluded.account_type,
    approval_status = excluded.approval_status;

  if requested_role = 'customer' then
    insert into public.user_roles(user_id, role) values (new.id, 'customer'::public.app_role) on conflict (user_id, role) do nothing;
  elsif requested_role = 'teacher' then
    insert into public.user_roles(user_id, role) values (new.id, 'teacher'::public.app_role) on conflict (user_id, role) do nothing;
  else
    insert into public.user_roles(user_id, role) values (new.id, 'student'::public.app_role) on conflict (user_id, role) do nothing;
  end if;

  if lower(coalesce(new.email, '')) = 'klunsar@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin'::public.app_role) on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;
