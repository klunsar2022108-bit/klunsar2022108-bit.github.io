-- Academic periods, configurable registration rules, order delivery confirmation/chat, reviews and pricing history.
create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(), name text not null, academic_year text not null, term text,
  registration_open_at timestamptz not null, registration_close_at timestamptz not null, programme_start_at timestamptz, programme_end_at timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);

alter table public.enrollments add column if not exists academic_period_id uuid references public.academic_periods(id) on delete set null;

create table if not exists public.course_groups (
  id uuid primary key default gen_random_uuid(), name text not null unique, description text not null default '', created_at timestamptz not null default now()
);
alter table public.courses add column if not exists course_group_id uuid references public.course_groups(id) on delete set null;

create table if not exists public.registration_rules (
  id uuid primary key default gen_random_uuid(), rule_type text not null check (rule_type in ('conflict','prerequisite','capacity')),
  course_id uuid references public.courses(id) on delete cascade, related_course_id uuid references public.courses(id) on delete cascade,
  message text not null default '', active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.course_repeat_requests (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, academic_period_id uuid references public.academic_periods(id) on delete set null,
  reason text not null, status text not null default 'pending', rejection_reason text, reviewed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_confirmed_at timestamptz;
alter table public.orders add column if not exists delivered_by uuid references auth.users(id) on delete set null;

create table if not exists public.order_chats (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade, message text not null, created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id) on delete cascade,
  review_type text not null check (review_type in ('course','teacher','programme','product','service')),
  target_id uuid, rating integer not null check (rating between 1 and 5), title text not null default '', body text not null,
  status text not null default 'pending', admin_response text, moderated_by uuid references auth.users(id) on delete set null, moderated_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(), product_id uuid references public.products(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade, old_price numeric(12,2), new_price numeric(12,2), changed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['academic_periods','course_groups','registration_rules','course_repeat_requests','order_chats','reviews','price_history'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "users read active periods" on public.academic_periods for select to authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "admins manage periods" on public.academic_periods for all to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "students read repeat requests" on public.course_repeat_requests for select to authenticated using (student_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "students create repeat requests" on public.course_repeat_requests for insert to authenticated with check (student_id = auth.uid());
create policy "admins manage repeat requests" on public.course_repeat_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "order participants read chat" on public.order_chats for select to authenticated using (sender_id = auth.uid() or exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "order participants send chat" on public.order_chats for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "users read published reviews" on public.reviews for select to anon, authenticated using (status = 'published' or author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users create reviews" on public.reviews for insert to authenticated with check (author_id = auth.uid());
create policy "admins moderate reviews" on public.reviews for update to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin()) with check (public.has_role(auth.uid(),'admin') or public.is_super_admin());
create policy "admins read price history" on public.price_history for select to authenticated using (public.has_role(auth.uid(),'admin') or public.is_super_admin());

create or replace function public.validate_course_registration(_student_id uuid, _course_id uuid, _period_id uuid)
returns table(allowed boolean, requires_repeat_confirmation boolean, reason text)
language plpgsql security definer set search_path = public as $$
declare completed boolean;
        conflict_found boolean;
begin
  if exists (select 1 from public.enrollment_courses ec join public.enrollments e on e.id = ec.enrollment_id where e.user_id = _student_id and e.academic_period_id = _period_id and ec.course_id = _course_id) then
    return query select false, false, 'You are already enrolled in this course for this academic period.'; return;
  end if;
  select exists (select 1 from public.exam_results er join public.exams ex on ex.id = er.exam_id where er.user_id = _student_id and ex.course_id = _course_id and lower(er.status) in ('passed','completed')) into completed;
  if completed then return query select true, true, 'You previously completed this course. Confirmation is required to repeat it.'; return; end if;
  select exists (select 1 from public.registration_rules rr where rr.active and rr.rule_type = 'conflict' and ((rr.course_id = _course_id and rr.related_course_id in (select ec.course_id from public.enrollment_courses ec join public.enrollments e on e.id = ec.enrollment_id where e.user_id = _student_id and e.academic_period_id = _period_id)) or (rr.related_course_id = _course_id and rr.course_id in (select ec.course_id from public.enrollment_courses ec join public.enrollments e on e.id = ec.enrollment_id where e.user_id = _student_id and e.academic_period_id = _period_id)))) into conflict_found;
  if conflict_found then return query select false, false, 'This course conflicts with another selected course.'; return; end if;
  return query select true, false, 'Registration allowed.';
end; $$;

grant execute on function public.validate_course_registration(uuid, uuid, uuid) to authenticated;
