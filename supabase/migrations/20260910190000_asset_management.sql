-- Organisational asset and equipment custody module.
-- Separate from saleable products and stock inventory.

create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.asset_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique,
  name text not null,
  category_id uuid references public.asset_categories(id) on delete set null,
  asset_type text not null default '',
  brand text,
  model text,
  serial_number text,
  quantity integer not null default 1 check (quantity > 0),
  acquisition_date date,
  purchase_cost numeric(12,2) not null default 0,
  supplier text,
  warranty text,
  location_id uuid references public.asset_locations(id) on delete set null,
  current_custodian_id uuid references auth.users(id) on delete set null,
  condition text not null default 'good',
  status text not null default 'available',
  description text not null default '',
  qr_code text,
  image_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_custody_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  from_custodian_id uuid references auth.users(id) on delete set null,
  to_custodian_id uuid references auth.users(id) on delete set null,
  from_location_id uuid references public.asset_locations(id) on delete set null,
  to_location_id uuid references public.asset_locations(id) on delete set null,
  action text not null,
  condition text,
  reason text not null default '',
  confirmed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_transfers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  from_custodian_id uuid references auth.users(id) on delete set null,
  to_custodian_id uuid references auth.users(id) on delete set null,
  from_location_id uuid references public.asset_locations(id) on delete set null,
  to_location_id uuid references public.asset_locations(id) on delete set null,
  transfer_type text not null check (transfer_type in ('return_to_admin','person_handover')),
  reason text not null default '',
  condition_at_handover text not null default 'good',
  status text not null default 'pending',
  admin_approved_by uuid references auth.users(id) on delete set null,
  admin_approved_at timestamptz,
  recipient_seen_at timestamptz,
  recipient_confirmed_at timestamptz,
  recipient_rejected_at timestamptz,
  rejection_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.asset_incidents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  incident_type text not null check (incident_type in ('damage','missing','lost','stolen','fault','missing_component','other')),
  description text not null,
  status text not null default 'open',
  reported_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  maintenance_date date not null default current_date,
  problem text not null,
  technician text,
  provider text,
  repair_cost numeric(12,2) not null default 0,
  repair_description text not null default '',
  condition_after text,
  next_maintenance_date date,
  status text not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_disposals (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  disposal_type text not null default 'retired',
  reason text not null,
  disposal_date date not null default current_date,
  approved_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_audit_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete set null,
  transfer_id uuid references public.asset_transfers(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  reason text not null default '',
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['asset_categories','asset_locations','assets','asset_custody_history','asset_transfers','asset_incidents','asset_maintenance','asset_disposals','asset_audit_logs'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "users read assigned assets" on public.assets for select to authenticated using (current_custodian_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins register assets" on public.assets for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins update assets" on public.assets for update to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins manage asset taxonomy" on public.asset_categories for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "authenticated read locations" on public.asset_locations for select to authenticated using (true);
create policy "admins manage locations" on public.asset_locations for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());

create policy "users read relevant custody history" on public.asset_custody_history for select to authenticated using (from_custodian_id = auth.uid() or to_custodian_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins create custody history" on public.asset_custody_history for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "users read asset transfers" on public.asset_transfers for select to authenticated using (from_custodian_id = auth.uid() or to_custodian_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "custodians request transfers" on public.asset_transfers for insert to authenticated with check (from_custodian_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins review transfers" on public.asset_transfers for update to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "custodians read incidents" on public.asset_incidents for select to authenticated using (reported_by = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "custodians report incidents" on public.asset_incidents for insert to authenticated with check (reported_by = auth.uid());
create policy "admins manage maintenance" on public.asset_maintenance for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins manage disposals" on public.asset_disposals for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins read asset audit" on public.asset_audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());

create or replace function public.approve_asset_transfer(_transfer_id uuid, _approved boolean, _reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare transfer_record public.asset_transfers;
begin
  if not public.has_role(auth.uid(),'admin') and not public.is_super_admin() then raise exception 'Admin access required'; end if;
  select * into transfer_record from public.asset_transfers where id = _transfer_id for update;
  if transfer_record.id is null then raise exception 'Transfer not found'; end if;
  if not _approved and nullif(trim(_reason),'') is null then raise exception 'Rejection reason required'; end if;
  if _approved then
    update public.asset_transfers set status = case when to_custodian_id is null then 'completed' else 'awaiting_recipient_confirmation' end, admin_approved_by = auth.uid(), admin_approved_at = now() where id = _transfer_id;
    if transfer_record.to_custodian_id is null then
      update public.assets set current_custodian_id = null, status = 'available' where id = transfer_record.asset_id;
      insert into public.asset_custody_history(asset_id, from_custodian_id, to_custodian_id, action, reason, confirmed_by, created_by) values (transfer_record.asset_id, transfer_record.from_custodian_id, null, 'returned_to_admin', transfer_record.reason, auth.uid(), auth.uid());
    end if;
  else update public.asset_transfers set status = 'rejected', rejection_reason = trim(_reason), admin_approved_by = auth.uid(), admin_approved_at = now() where id = _transfer_id; end if;
end; $$;

grant execute on function public.approve_asset_transfer(uuid, boolean, text) to authenticated;

create or replace function public.confirm_asset_transfer(_transfer_id uuid, _received boolean, _reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare transfer_record public.asset_transfers;
begin
  select * into transfer_record from public.asset_transfers where id = _transfer_id and to_custodian_id = auth.uid() for update;
  if transfer_record.id is null then raise exception 'Transfer not found or not assigned to you'; end if;
  if _received then
    update public.asset_transfers set status = 'completed', recipient_seen_at = coalesce(recipient_seen_at, now()), recipient_confirmed_at = now(), completed_at = now() where id = _transfer_id;
    update public.assets set current_custodian_id = auth.uid(), status = 'assigned' where id = transfer_record.asset_id;
    insert into public.asset_custody_history(asset_id, from_custodian_id, to_custodian_id, action, condition, reason, confirmed_by, created_by) values (transfer_record.asset_id, transfer_record.from_custodian_id, auth.uid(), 'transferred', transfer_record.condition_at_handover, transfer_record.reason, auth.uid(), auth.uid());
  else
    update public.asset_transfers set status = 'disputed', recipient_seen_at = coalesce(recipient_seen_at, now()), recipient_rejected_at = now(), rejection_reason = nullif(trim(_reason),'') where id = _transfer_id;
  end if;
end; $$;

grant execute on function public.confirm_asset_transfer(uuid, boolean, text) to authenticated;
