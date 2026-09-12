-- Public certificate verification without exposing private student records.
create or replace function public.verify_certificate(_certificate_no text)
returns table(certificate_no text, title text, graduation_date date, status text, student_name text)
language sql stable security definer set search_path = public as $$
  select c.certificate_no, c.title, c.graduation_date, c.status, p.full_name
  from public.certificates c
  left join public.profiles p on p.id = c.user_id
  where upper(c.certificate_no) = upper(trim(_certificate_no)) and c.status = 'issued'
  limit 1
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
