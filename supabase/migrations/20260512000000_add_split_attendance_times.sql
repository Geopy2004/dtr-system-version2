alter table public.attendance
  add column if not exists morning_time_in timestamptz,
  add column if not exists lunch_time_out timestamptz,
  add column if not exists lunch_time_in timestamptz,
  add column if not exists afternoon_time_out timestamptz;

update public.attendance
set
  morning_time_in = coalesce(morning_time_in, time_in),
  afternoon_time_out = coalesce(afternoon_time_out, time_out)
where time_in is not null
   or time_out is not null;
