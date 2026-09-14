alter table public.profiles
  add column if not exists address text,
  add column if not exists parent_phone text;

comment on column public.profiles.address is 'User contact or delivery address editable by the profile owner.';
comment on column public.profiles.parent_phone is 'Parent or guardian phone for student contact workflows.';
