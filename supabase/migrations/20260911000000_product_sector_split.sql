alter table public.products
  add column if not exists sector text not null default 'student';

update public.products
set sector = 'student'
where sector is null or sector not in ('student', 'business');

alter table public.products
  drop constraint if exists products_sector_check;

alter table public.products
  add constraint products_sector_check
  check (sector in ('student', 'business'));

create index if not exists idx_products_sector
  on public.products (sector, active, sort_order);
