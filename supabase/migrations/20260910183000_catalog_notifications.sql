-- Notify relevant users when the public catalogue changes.
create or replace function public.notify_catalogue_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare item_name text;
        event_title text;
        event_message text;
begin
  item_name := coalesce(new.name, old.name);
  event_title := case when tg_table_name = 'services' then 'Service catalogue update' else 'Product catalogue update' end;
  event_message := item_name || case when tg_op = 'INSERT' then ' is now available.' else ' has been updated.' end;
  insert into public.user_notifications (user_id, title, message, type, created_by)
  select ur.user_id, event_title, event_message, case when tg_table_name = 'services' then 'service' else 'product' end, auth.uid()
  from public.user_roles ur
  where ur.role in ('customer'::public.app_role, 'student'::public.app_role)
    and ur.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  return coalesce(new, old);
end; $$;

drop trigger if exists notify_product_catalogue_change on public.products;
create trigger notify_product_catalogue_change after insert or update on public.products for each row execute function public.notify_catalogue_change();
drop trigger if exists notify_service_catalogue_change on public.services;
create trigger notify_service_catalogue_change after insert or update on public.services for each row execute function public.notify_catalogue_change();
