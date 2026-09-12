-- Audited email delivery queue. A deployed mail worker/Edge Function sends pending rows.
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.user_notifications(id) on delete set null,
  recipient text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;
alter table public.email_outbox enable row level security;
create policy "admins read email outbox" on public.email_outbox for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());

create or replace function public.queue_notification_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient_email text;
        email_enabled boolean;
begin
  select email into recipient_email from public.profiles where id = new.user_id;
  select coalesce(enabled, false) into email_enabled from public.notification_channels where user_id = new.user_id and channel = 'email';
  if email_enabled and nullif(recipient_email, '') is not null then
    insert into public.email_outbox(user_id, notification_id, recipient, subject, body)
    values (new.user_id, new.id, recipient_email, new.title, new.message);
  end if;
  return new;
end; $$;

drop trigger if exists queue_notification_email on public.user_notifications;
create trigger queue_notification_email after insert on public.user_notifications for each row execute function public.queue_notification_email();
