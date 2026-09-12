-- Enforce the detailed role matrix at the database layer.
insert into public.role_permissions (role, action, description) values
  ('customer', 'browse_catalogue', 'Browse products and services'),
  ('student', 'browse_catalogue', 'Browse products and services'),
  ('teacher', 'browse_catalogue', 'Browse products and services'),
  ('admin', 'browse_catalogue', 'Browse products and services'),
  ('super_admin', 'browse_catalogue', 'Browse products and services'),
  ('customer', 'purchase_products', 'Purchase products and services'),
  ('student', 'purchase_products', 'Purchase products and services'),
  ('teacher', 'purchase_products', 'Purchase products and services'),
  ('admin', 'purchase_products', 'Purchase products and services'),
  ('super_admin', 'purchase_products', 'Purchase products and services'),
  ('student', 'register_programme', 'Register for programmes'),
  ('admin', 'register_programme', 'Register students for programmes'),
  ('super_admin', 'register_programme', 'Register students for programmes'),
  ('student', 'view_own_academics', 'View own academic records'),
  ('teacher', 'view_assigned_students', 'View assigned student records'),
  ('admin', 'view_assigned_students', 'View student records'),
  ('super_admin', 'view_assigned_students', 'View student records'),
  ('admin', 'approve_payments', 'Approve payments'),
  ('super_admin', 'approve_payments', 'Approve payments'),
  ('admin', 'approve_registrations', 'Approve registrations'),
  ('super_admin', 'approve_registrations', 'Approve registrations'),
  ('admin', 'manage_teachers', 'Manage teachers'),
  ('super_admin', 'manage_teachers', 'Manage teachers'),
  ('admin', 'manage_users', 'Manage users'),
  ('super_admin', 'manage_users', 'Manage users'),
  ('super_admin', 'manage_roles', 'Change user roles'),
  ('admin', 'view_basic_analytics', 'View basic business analytics'),
  ('super_admin', 'view_basic_analytics', 'View basic business analytics'),
  ('super_admin', 'view_high_level_analytics', 'View high-level financial analytics')
on conflict (role, action) do nothing;

-- Purchase permission is required for online order creation.
drop policy if exists "own rows insert orders" on public.orders;
create policy "permitted users insert orders" on public.orders for insert to authenticated
with check (user_id = auth.uid() and public.has_permission('purchase_products'));

-- Only students, Admins, and Super Admins can create programme registrations.
drop policy if exists "own rows insert enrollments" on public.enrollments;
create policy "permitted users insert enrollments" on public.enrollments for insert to authenticated
with check (user_id = auth.uid() and (public.has_permission('register_programme') or public.has_role(auth.uid(),'admin') or public.is_super_admin()));

-- Relationship indexes for common dashboards and reports.
create index if not exists idx_enrollments_user_status on public.enrollments(user_id, status);
create index if not exists idx_teacher_assignments_teacher_status on public.teacher_assignments(teacher_id, status);
create index if not exists idx_teacher_assignments_student_status on public.teacher_assignments(student_id, status);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_order_payments_status on public.order_payments(status, created_at);
create index if not exists idx_notifications_user_created on public.user_notifications(user_id, created_at desc);
create index if not exists idx_audit_resource on public.admin_audit_events(resource_type, resource_id, created_at desc);
