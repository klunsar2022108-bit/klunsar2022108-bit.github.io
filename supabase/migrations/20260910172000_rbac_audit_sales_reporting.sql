-- Server-side RBAC, automatic audit trail, role-scoped analytics, and unified sales reporting.

alter table public.admin_audit_events
  alter column actor_id drop not null,
  add column if not exists resource_type text,
  add column if not exists resource_id uuid;

alter table public.retail_sales
  add column if not exists sales_channel text not null default 'physical_shop',
  add column if not exists source_reference text;

alter table public.orders
  add column if not exists sales_channel text not null default 'online';

create or replace function public.has_permission(_action text, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = _user_id and rp.action = _action
  )
$$;

grant execute on function public.has_permission(text, uuid) to authenticated;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor uuid;
        target uuid;
        record_id uuid;
begin
  actor := auth.uid();
  record_id := coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null);
  target := case
    when tg_table_name in ('profiles','user_roles') then coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null)
    when tg_table_name = 'orders' then coalesce((case when tg_op = 'DELETE' then old.user_id else new.user_id end), null)
    else null
  end;
  insert into public.admin_audit_events(actor_id, action, target_user_id, resource_type, resource_id, details)
  values (
    actor,
    lower(tg_op) || '_' || tg_table_name,
    target,
    tg_table_name,
    record_id,
    jsonb_build_object('table', tg_table_name, 'operation', tg_op, 'at', now())
  );
  return coalesce(new, old);
end; $$;

-- These triggers capture approval/rejection, payment, role, expense, sales, and admin changes.
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.audit_row_change();
drop trigger if exists audit_order_payments on public.order_payments;
create trigger audit_order_payments after insert or update or delete on public.order_payments for each row execute function public.audit_row_change();
drop trigger if exists audit_user_roles on public.user_roles;
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.audit_row_change();
drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_row_change();
drop trigger if exists audit_expenses on public.expenses;
create trigger audit_expenses after insert or update or delete on public.expenses for each row execute function public.audit_row_change();
drop trigger if exists audit_retail_sales on public.retail_sales;
create trigger audit_retail_sales after insert or update or delete on public.retail_sales for each row execute function public.audit_row_change();
drop trigger if exists audit_approval_requests on public.approval_requests;
create trigger audit_approval_requests after insert or update or delete on public.approval_requests for each row execute function public.audit_row_change();

-- Use one reporting source while preserving online vs physical channel.
create or replace view public.sales_channel_analytics with (security_invoker = true) as
select sales_channel, count(*)::integer as sale_count, coalesce(sum(total), 0)::numeric(12,2) as revenue
from (
  select sales_channel, total from public.orders where payment_status = 'approved'
  union all
  select sales_channel, total from public.retail_sales
) sales
group by sales_channel;

-- Do not expose financial summary directly to every authenticated role.
revoke all on public.financial_summary from authenticated;
create or replace function public.get_financial_summary()
returns table(income numeric, expenditure numeric, profit numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') and not public.has_role(auth.uid(),'super_admin') then
    raise exception 'Admin access required';
  end if;
  return query
  select
    coalesce((select sum(total) from public.orders where payment_status = 'approved'), 0)::numeric(12,2) +
    coalesce((select sum(total) from public.retail_sales), 0)::numeric(12,2),
    case when public.is_super_admin() then coalesce((select sum(amount) from public.expenses where approval_status = 'approved'), 0)::numeric(12,2) else null end,
    case when public.is_super_admin() then (
      coalesce((select sum(total) from public.orders where payment_status = 'approved'), 0) +
      coalesce((select sum(total) from public.retail_sales), 0) -
      coalesce((select sum(amount) from public.expenses where approval_status = 'approved'), 0)
    )::numeric(12,2) else null end;
end; $$;

grant execute on function public.get_financial_summary() to authenticated;
revoke all on public.sales_channel_analytics from authenticated;

create or replace function public.get_sales_channel_analytics()
returns table(sales_channel text, sale_count integer, revenue numeric)
language sql security definer set search_path = public as $$
  select * from public.sales_channel_analytics
  where public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')
$$;

grant execute on function public.get_sales_channel_analytics() to authenticated;

-- Catalogue management is permission-driven, not UI-driven.
drop policy if exists "admins manage services" on public.services;
create policy "catalogue permission manages services" on public.services for all to authenticated
  using (public.has_permission('manage_catalogue')) with check (public.has_permission('manage_catalogue'));
