-- Allow customers to cancel their own pending orders and update their order details before approval.
create or replace function public.transition_order_status(
  _order_id uuid,
  _next_status text,
  _reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  actor uuid := auth.uid();
  order_owner uuid;
begin
  if _order_id is null then
    raise exception 'Order id is required';
  end if;

  select status, user_id into current_status, order_owner
  from public.orders
  where id = _order_id
  for update;

  if current_status is null then
    raise exception 'Order not found';
  end if;

  if not public.has_role(actor,'admin') and not public.has_role(actor,'super_admin') and order_owner <> actor then
    raise exception 'You can only manage your own orders';
  end if;

  if not public.has_role(actor,'admin') and not public.has_role(actor,'super_admin') and _next_status <> 'cancelled' then
    raise exception 'Customers can only cancel their own orders';
  end if;

  if _next_status not in ('pending','pending_approval','approved','processing','ready','shipped','out_for_delivery','delivered','completed','rejected','cancelled') then
    raise exception 'Invalid order status';
  end if;

  if _next_status = 'rejected' and nullif(trim(_reason),'') is null then
    raise exception 'Rejection reason required';
  end if;

  if current_status in ('completed','cancelled','rejected') and _next_status <> current_status then
    raise exception 'Finalized orders cannot be reopened';
  end if;

  update public.orders set
    status = _next_status,
    rejection_reason = case when _next_status = 'rejected' then trim(_reason) else rejection_reason end,
    delivery_status = case when _next_status in ('processing','ready','shipped','out_for_delivery','delivered') then _next_status else delivery_status end,
    delivery_visible = _next_status in ('approved','processing','ready','shipped','out_for_delivery','delivered','completed'),
    payment_status = case when _next_status = 'cancelled' then 'cancelled' else payment_status end
  where id = _order_id;
end;
$$;

grant execute on function public.transition_order_status(uuid, text, text) to authenticated;

create or replace function public.customer_update_order(
  _order_id uuid,
  _customer_phone text default null,
  _delivery_address text default null,
  _notes text default null,
  _payment_reference text default null,
  _amount_paid numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_owner uuid;
  current_status text;
  current_total numeric;
  normalized_phone text;
  normalized_address text;
  normalized_notes text;
  normalized_ref text;
  new_amount_paid numeric;
begin
  if _order_id is null then
    raise exception 'Order id is required';
  end if;

  select user_id, status, total into order_owner, current_status, current_total
  from public.orders
  where id = _order_id
  for update;

  if order_owner is null then
    raise exception 'Order not found';
  end if;

  if order_owner <> actor then
    raise exception 'You can only update your own orders';
  end if;

  if current_status in ('completed','cancelled','rejected') then
    raise exception 'This order can no longer be edited';
  end if;

  normalized_phone := nullif(trim(coalesce(_customer_phone, '')), '');
  normalized_address := nullif(trim(coalesce(_delivery_address, '')), '');
  normalized_notes := nullif(trim(coalesce(_notes, '')), '');
  normalized_ref := nullif(trim(coalesce(_payment_reference, '')), '');

  if normalized_phone is not null then
    update public.orders set customer_phone = normalized_phone where id = _order_id;
  end if;

  if normalized_address is not null then
    update public.orders set delivery_address = normalized_address where id = _order_id;
  end if;

  if normalized_notes is not null then
    update public.orders set notes = normalized_notes where id = _order_id;
  end if;

  if normalized_ref is not null then
    update public.orders set payment_reference = normalized_ref, payment_status = 'awaiting_verification' where id = _order_id;
  end if;

  if _amount_paid is not null then
    if _amount_paid < 0 then
      raise exception 'Amount paid cannot be negative';
    end if;

    if _amount_paid > coalesce(current_total, 0) then
      raise exception 'Amount paid cannot exceed the order total';
    end if;

    new_amount_paid := _amount_paid;
    update public.orders set
      amount_paid = new_amount_paid,
      balance_due = greatest(current_total - new_amount_paid, 0),
      payment_status = 'awaiting_verification'
    where id = _order_id;
  end if;
end;
$$;

grant execute on function public.customer_update_order(uuid, text, text, text, text, numeric) to authenticated;
