alter table public.attendance
  add column if not exists early_minutes integer not null default 0,
  add column if not exists timing_breakdown jsonb not null default '{}'::jsonb;

create or replace function app_private.compute_attendance()
returns trigger
language plpgsql
as $$
declare
  start_at timestamptz;
  end_at timestamptz;
  target_date date;
  shift_start_time time := '08:00';
  shift_end_time time := '17:00';
  shift_break_minutes integer := 60;
  shift_grace_minutes integer := 15;
  expected_shift_hours numeric := 8;
  shift_start timestamptz;
  shift_end timestamptz;
  break_out_target timestamptz;
  break_in_target timestamptz;
  work_before_break_minutes integer;
  morning_hours numeric := 0;
  afternoon_hours numeric := 0;
  morning_early integer := 0;
  morning_late integer := 0;
  lunch_out_early integer := 0;
  lunch_out_late integer := 0;
  lunch_in_early integer := 0;
  lunch_in_late integer := 0;
  afternoon_out_early integer := 0;
  afternoon_out_late integer := 0;
begin
  start_at := coalesce(new.morning_time_in, new.time_in);
  end_at := coalesce(new.afternoon_time_out, new.time_out);

  select
    coalesce(s.start_time, shift_start_time),
    coalesce(s.end_time, shift_end_time),
    coalesce(s.break_minutes, shift_break_minutes),
    coalesce(s.grace_period_minutes, shift_grace_minutes),
    coalesce(s.expected_hours, expected_shift_hours)
  into
    shift_start_time,
    shift_end_time,
    shift_break_minutes,
    shift_grace_minutes,
    expected_shift_hours
  from public.profiles p
  left join public.shifts s on s.id = p.shift_id
  where p.id = new.user_id;

  if new.timing_breakdown ? 'shift' then
    shift_start_time := coalesce(nullif(new.timing_breakdown #>> '{shift,start_time}', '')::time, shift_start_time);
    shift_end_time := coalesce(nullif(new.timing_breakdown #>> '{shift,end_time}', '')::time, shift_end_time);
    shift_break_minutes := coalesce(nullif(new.timing_breakdown #>> '{shift,break_minutes}', '')::integer, shift_break_minutes);
    shift_grace_minutes := coalesce(nullif(new.timing_breakdown #>> '{shift,grace_period_minutes}', '')::integer, shift_grace_minutes);
    expected_shift_hours := coalesce(nullif(new.timing_breakdown #>> '{shift,expected_hours}', '')::numeric, expected_shift_hours);
  end if;

  shift_start_time := coalesce(shift_start_time, '08:00');
  shift_end_time := coalesce(shift_end_time, '17:00');
  shift_break_minutes := coalesce(shift_break_minutes, 60);
  shift_grace_minutes := coalesce(shift_grace_minutes, 15);
  expected_shift_hours := coalesce(expected_shift_hours, 8);

  if start_at is not null then
    if new.date is not null then
      target_date := new.date;
    elsif shift_end_time <= shift_start_time and start_at::time < shift_end_time then
      target_date := (start_at at time zone current_setting('timezone'))::date - 1;
    else
      target_date := (start_at at time zone current_setting('timezone'))::date;
    end if;

    new.date := target_date;
    new.time_in := coalesce(new.time_in, start_at);
    new.morning_time_in := coalesce(new.morning_time_in, start_at);

    shift_start := target_date + shift_start_time;
    shift_end := target_date + shift_end_time;
    if shift_end <= shift_start then
      shift_end := shift_end + interval '1 day';
    end if;

    work_before_break_minutes := greatest(
      0,
      round((extract(epoch from (shift_end - shift_start)) / 60 - shift_break_minutes) / 2)::integer
    );
    break_out_target := shift_start + make_interval(mins => work_before_break_minutes);
    break_in_target := break_out_target + make_interval(mins => shift_break_minutes);

    morning_early := greatest(0, round(extract(epoch from (shift_start - new.morning_time_in)) / 60)::integer);
    morning_late := greatest(
      0,
      round(extract(epoch from (new.morning_time_in - shift_start)) / 60)::integer - shift_grace_minutes
    );

    if new.lunch_time_out is not null then
      lunch_out_early := greatest(0, round(extract(epoch from (break_out_target - new.lunch_time_out)) / 60)::integer);
      lunch_out_late := greatest(
        0,
        round(extract(epoch from (new.lunch_time_out - break_out_target)) / 60)::integer - shift_grace_minutes
      );
    end if;

    if new.lunch_time_in is not null then
      lunch_in_early := greatest(0, round(extract(epoch from (break_in_target - new.lunch_time_in)) / 60)::integer);
      lunch_in_late := greatest(
        0,
        round(extract(epoch from (new.lunch_time_in - break_in_target)) / 60)::integer - shift_grace_minutes
      );
    end if;

    if end_at is not null then
      new.time_out := coalesce(new.time_out, end_at);
      new.afternoon_time_out := coalesce(new.afternoon_time_out, end_at);
      afternoon_out_early := greatest(0, round(extract(epoch from (shift_end - new.afternoon_time_out)) / 60)::integer);
      afternoon_out_late := greatest(
        0,
        round(extract(epoch from (new.afternoon_time_out - shift_end)) / 60)::integer - shift_grace_minutes
      );
    end if;

    new.early_minutes := morning_early + lunch_out_early + lunch_in_early + afternoon_out_early;
    new.late_minutes := morning_late + lunch_out_late + lunch_in_late + afternoon_out_late;
    new.timing_breakdown := jsonb_build_object(
      'shift', jsonb_build_object(
        'start_time', shift_start_time,
        'end_time', shift_end_time,
        'break_minutes', shift_break_minutes,
        'grace_period_minutes', shift_grace_minutes,
        'expected_hours', expected_shift_hours
      ),
      'targets', jsonb_build_object(
        'morning_time_in', shift_start,
        'lunch_time_out', break_out_target,
        'lunch_time_in', break_in_target,
        'afternoon_time_out', shift_end
      ),
      'checkpoints', jsonb_build_object(
        'morning_time_in', jsonb_build_object('early', morning_early, 'late', morning_late),
        'lunch_time_out', jsonb_build_object('early', lunch_out_early, 'late', lunch_out_late),
        'lunch_time_in', jsonb_build_object('early', lunch_in_early, 'late', lunch_in_late),
        'afternoon_time_out', jsonb_build_object('early', afternoon_out_early, 'late', afternoon_out_late)
      )
    );
  end if;

  if end_at is not null then
    if new.morning_time_in is not null and new.lunch_time_out is not null then
      morning_hours := greatest(0, extract(epoch from (new.lunch_time_out - new.morning_time_in)) / 3600);
    end if;

    if new.lunch_time_in is not null and new.afternoon_time_out is not null then
      afternoon_hours := greatest(0, extract(epoch from (new.afternoon_time_out - new.lunch_time_in)) / 3600);
    end if;

    if morning_hours + afternoon_hours > 0 then
      new.hours_worked := round((morning_hours + afternoon_hours)::numeric, 2);
    elsif start_at is not null then
      new.hours_worked := round(greatest(0, extract(epoch from (end_at - start_at)) / 3600)::numeric, 2);
    end if;

    new.overtime_minutes := greatest(0, round((new.hours_worked - expected_shift_hours) * 60)::integer);
    new.undertime_minutes := greatest(0, round((expected_shift_hours - new.hours_worked) * 60)::integer);
  end if;

  if new.status <> 'absent' then
    if new.late_minutes > 0 then
      new.status := 'late';
    elsif end_at is not null and new.hours_worked > expected_shift_hours then
      new.status := 'overtime';
    elsif end_at is not null and new.hours_worked < expected_shift_hours then
      new.status := 'undertime';
    elsif new.status in ('pending', 'late', 'overtime', 'undertime') or new.status is null then
      new.status := 'present';
    end if;
  end if;

  return new;
end;
$$;
