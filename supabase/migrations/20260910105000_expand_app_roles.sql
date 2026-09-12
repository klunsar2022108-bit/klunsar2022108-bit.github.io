-- Expand the role enum before migrations create policies that reference these values.
alter type public.app_role add value if not exists 'customer';
alter type public.app_role add value if not exists 'teacher';
alter type public.app_role add value if not exists 'super_admin';
