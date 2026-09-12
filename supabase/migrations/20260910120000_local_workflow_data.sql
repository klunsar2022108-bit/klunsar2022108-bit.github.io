-- Database tables for workflows that previously used browser localStorage.
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  subject text not null default '',
  message text not null,
  status text not null default 'open',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id text not null,
  service_name text not null,
  message text not null,
  status text not null default 'pending',
  admin_response text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null default '',
  message text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.message_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  audience text not null default 'assigned_students',
  programme text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.salary_review_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes text not null default ''
);

grant select, insert, update on public.contact_inquiries to authenticated;
grant select, insert, update on public.service_requests to authenticated;
grant select, insert on public.customer_feedback to authenticated;
grant select, insert on public.message_broadcasts to authenticated;
grant select, insert, update on public.salary_review_requests to authenticated;
grant all on public.contact_inquiries, public.service_requests, public.customer_feedback, public.message_broadcasts, public.salary_review_requests to service_role;

alter table public.contact_inquiries enable row level security;
alter table public.service_requests enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.message_broadcasts enable row level security;
alter table public.salary_review_requests enable row level security;

create policy "users create contact inquiries" on public.contact_inquiries for insert to authenticated with check (user_id is null or user_id = auth.uid());
create policy "users read own contact inquiries" on public.contact_inquiries for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage contact inquiries" on public.contact_inquiries for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "users manage own service requests" on public.service_requests for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users create service requests" on public.service_requests for insert to authenticated with check (user_id = auth.uid());
create policy "admins update service requests" on public.service_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "users create feedback" on public.customer_feedback for insert to authenticated with check (user_id is null or user_id = auth.uid());
create policy "users read own feedback" on public.customer_feedback for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "teachers create broadcasts" on public.message_broadcasts for insert to authenticated with check (sender_id = auth.uid() and public.has_role(auth.uid(),'teacher'));
create policy "users read broadcasts" on public.message_broadcasts for select to authenticated using (sender_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'teacher'));

create policy "teachers create salary reviews" on public.salary_review_requests for insert to authenticated with check (teacher_user_id = auth.uid() and public.has_role(auth.uid(),'teacher'));
create policy "teachers read own salary reviews" on public.salary_review_requests for select to authenticated using (teacher_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage salary reviews" on public.salary_review_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger contact_inquiries_updated before update on public.contact_inquiries for each row execute function public.set_updated_at();
