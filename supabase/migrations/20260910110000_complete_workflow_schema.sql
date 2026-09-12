-- Complete workflow schema for all app roles and database-backed operations.
-- Safe to run after the existing baseline, customer-rules, and admin-operations migrations.

alter table public.profiles
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists email text;

alter table public.tutors
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Replace the signup trigger so the selected role is stored instead of always creating students.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role text;
  safe_role public.app_role;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if requested_role not in ('customer', 'student', 'teacher') then
    requested_role := 'student';
  end if;
  safe_role := requested_role::public.app_role;

  insert into public.profiles (id, full_name, username, phone, email, approval_status)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'username',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    new.email,
    case when safe_role = 'customer' then 'approved' else 'pending' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.user_roles (user_id, role)
  values (new.id, safe_role)
  on conflict (user_id, role) do nothing;

  if lower(coalesce(new.email, '')) = 'klunsar@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;

-- Student registration/shift-change requests.
create table if not exists public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  current_shift_id uuid references public.shifts(id) on delete set null,
  requested_shift_id uuid references public.shifts(id) on delete set null,
  reason text not null default '',
  status text not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Teacher/student assignment history, including transfer notifications and audit context.
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  programme text not null default '',
  status text not null default 'active',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Database-backed chat for students, teachers, admins and super admins.
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'Support',
  thread_type text not null default 'support',
  created_by uuid not null references auth.users(id) on delete cascade,
  participant_user_id uuid references auth.users(id) on delete set null,
  participant_teacher_id uuid references public.tutors(id) on delete set null,
  approval_status text not null default 'pending',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Configurable operational approvals, such as weather closures or centre notices.
create table if not exists public.operational_approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null default '',
  category text not null default 'general',
  status text not null default 'pending',
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Teacher-submitted academic work awaiting authorized review.
create table if not exists public.result_submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  exam_id uuid references public.exams(id) on delete set null,
  score integer check (score is null or (score >= 0 and score <= 100)),
  feedback text not null default '',
  status text not null default 'pending_review',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Grants and row-level security.
grant select, insert, update, delete on public.shift_requests to authenticated;
grant select, insert, update, delete on public.teacher_assignments to authenticated;
grant select, insert, update on public.chat_threads to authenticated;
grant select, insert, update on public.chat_messages to authenticated;
grant select, insert, update, delete on public.operational_approvals to authenticated;
grant select, insert, update on public.result_submissions to authenticated;

grant all on public.shift_requests, public.teacher_assignments, public.chat_threads, public.chat_messages, public.operational_approvals, public.result_submissions to service_role;

alter table public.shift_requests enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.operational_approvals enable row level security;
alter table public.result_submissions enable row level security;

create policy "students read own shift requests" on public.shift_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "students create own shift requests" on public.shift_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy "admins manage shift requests" on public.shift_requests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "assignment participants read" on public.teacher_assignments for select to authenticated
  using (student_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.tutors t where t.id = teacher_id and t.user_id = auth.uid()));
create policy "admins manage assignments" on public.teacher_assignments for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "chat participants read threads" on public.chat_threads for select to authenticated
  using (created_by = auth.uid() or participant_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy "users create chat threads" on public.chat_threads for insert to authenticated
  with check (created_by = auth.uid());
create policy "participants update chat threads" on public.chat_threads for update to authenticated
  using (created_by = auth.uid() or participant_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (true);

create policy "chat participants read messages" on public.chat_messages for select to authenticated
  using (sender_id = auth.uid() or exists (select 1 from public.chat_threads t where t.id = thread_id and (t.created_by = auth.uid() or t.participant_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))));
create policy "chat participants send messages" on public.chat_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.chat_threads t where t.id = thread_id and (t.created_by = auth.uid() or t.participant_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))));
create policy "chat participants update messages" on public.chat_messages for update to authenticated
  using (sender_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')) with check (true);

create policy "users read operational approvals" on public.operational_approvals for select to authenticated using (true);
create policy "users request operational approval" on public.operational_approvals for insert to authenticated with check (requested_by = auth.uid());
create policy "admins manage operational approvals" on public.operational_approvals for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy "teachers read own result submissions" on public.result_submissions for select to authenticated
  using (exists (select 1 from public.tutors t where t.id = teacher_id and t.user_id = auth.uid()) or student_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "teachers submit results" on public.result_submissions for insert to authenticated
  with check (exists (select 1 from public.tutors t where t.user_id = auth.uid() and t.id = teacher_id));
create policy "admins review result submissions" on public.result_submissions for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger chat_threads_updated before update on public.chat_threads for each row execute function public.set_updated_at();
