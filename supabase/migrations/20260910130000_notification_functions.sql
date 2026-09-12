-- Secure notification fan-out functions for workflow events.
create or replace function public.create_user_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text default 'general'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare notification_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if auth.uid() <> _user_id and not public.has_role(auth.uid(),'admin') and not public.has_role(auth.uid(),'super_admin') then
    raise exception 'Not allowed to notify this user';
  end if;
  insert into public.user_notifications (user_id, title, message, type, created_by)
  values (_user_id, _title, _message, _type, auth.uid())
  returning id into notification_id;
  return notification_id;
end; $$;

grant execute on function public.create_user_notification(uuid, text, text, text) to authenticated;

create or replace function public.notify_admins(
  _title text,
  _message text,
  _type text default 'workflow'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare created_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_notifications (user_id, title, message, type, created_by)
  select ur.user_id, _title, _message, _type, auth.uid()
  from public.user_roles ur
  where ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role);
  get diagnostics created_count = row_count;
  return created_count;
end; $$;

grant execute on function public.notify_admins(text, text, text) to authenticated;
