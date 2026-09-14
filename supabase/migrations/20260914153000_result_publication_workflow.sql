alter table public.result_submissions
  add column if not exists published_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists correction_reason text;

create or replace function public.review_result_submission(
  _submission_id uuid,
  _decision text,
  _reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare submission_record public.result_submissions;
begin
  if not public.has_role(auth.uid(), 'admin') and not public.is_super_admin() then
    raise exception 'Admin access required';
  end if;

  select * into submission_record
  from public.result_submissions
  where id = _submission_id
  for update;

  if submission_record.id is null then raise exception 'Result submission not found'; end if;
  if submission_record.status in ('locked', 'published') then raise exception 'Result is already published or locked'; end if;
  if _decision not in ('approved', 'rejected', 'published', 'locked') then raise exception 'Invalid result decision'; end if;
  if _decision = 'rejected' and nullif(trim(_reason), '') is null then raise exception 'Rejection reason required'; end if;

  update public.result_submissions
  set status = _decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      correction_reason = nullif(trim(_reason), ''),
      published_at = case when _decision in ('published', 'locked') then coalesce(published_at, now()) else published_at end,
      locked_at = case when _decision = 'locked' then coalesce(locked_at, now()) else locked_at end
  where id = _submission_id;

  if _decision in ('published', 'locked') and submission_record.exam_id is not null then
    insert into public.exam_results(user_id, exam_id, score, status, taken_on, remarks)
    values (
      submission_record.student_id,
      submission_record.exam_id,
      submission_record.score,
      case when submission_record.score >= 50 then 'passed' else 'failed' end,
      current_date,
      submission_record.feedback
    );
  end if;
end;
$$;

grant execute on function public.review_result_submission(uuid, text, text) to authenticated;
