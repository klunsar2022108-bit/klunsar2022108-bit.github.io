-- Academic completion and inventory accounting rules.
alter table public.products
  add column if not exists sku text unique,
  add column if not exists cost_price numeric(12,2) not null default 0;

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare delta integer;
begin
  delta := case
    when new.movement_type in ('opening','received','return') then new.quantity
    when new.movement_type = 'sale' then -abs(new.quantity)
    when new.movement_type = 'adjustment' then new.quantity
    else 0
  end;
  update public.products
  set stock_quantity = greatest(coalesce(stock_quantity, 0) + delta, 0)
  where id = new.product_id;
  return new;
end; $$;

drop trigger if exists apply_stock_movement on public.stock_movements;
create trigger apply_stock_movement after insert on public.stock_movements
for each row execute function public.apply_stock_movement();

create or replace function public.issue_completion_certificate(_user_id uuid, _title text default 'Certificate of Completion')
returns uuid language plpgsql security definer set search_path = public as $$
declare certificate_id uuid;
        total_courses integer;
        passed_courses integer;
begin
  if auth.uid() <> _user_id and not public.has_role(auth.uid(),'admin') and not public.is_super_admin() then raise exception 'Not authorized'; end if;
  select count(*) into total_courses from public.enrollment_courses ec join public.enrollments e on e.id = ec.enrollment_id where e.user_id = _user_id;
  select count(*) into passed_courses from public.enrollment_courses ec join public.enrollments e on e.id = ec.enrollment_id where e.user_id = _user_id and ec.status in ('passed','completed') and ec.progress >= 100;
  if total_courses = 0 or passed_courses < total_courses then raise exception 'Programme is not complete'; end if;
  insert into public.certificates (user_id, title, certificate_no, graduation_date, status)
  values (_user_id, _title, 'KL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), current_date, 'issued')
  returning id into certificate_id;
  return certificate_id;
end; $$;

grant execute on function public.issue_completion_certificate(uuid, text) to authenticated;

create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_stock_movements_product_created on public.stock_movements(product_id, created_at desc);
create index if not exists idx_exam_results_user_created on public.exam_results(user_id, created_at desc);
create index if not exists idx_certificates_user_status on public.certificates(user_id, status);
