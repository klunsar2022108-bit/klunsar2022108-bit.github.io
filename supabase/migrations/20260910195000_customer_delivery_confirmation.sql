-- Customer delivery confirmation without allowing customers to forge delivery status.
create or replace function public.confirm_customer_delivery(_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.orders where id = _order_id and user_id = auth.uid()) then raise exception 'Order not found'; end if;
  update public.orders set status = 'completed', customer_confirmed_at = now() where id = _order_id and delivery_status = 'delivered';
  if not found then raise exception 'Delivery must be marked delivered before confirmation'; end if;
  insert into public.order_delivery_events(order_id, status, note, changed_by) values (_order_id, 'completed', 'Customer confirmed delivery receipt.', auth.uid());
end; $$;

grant execute on function public.confirm_customer_delivery(uuid) to authenticated;
