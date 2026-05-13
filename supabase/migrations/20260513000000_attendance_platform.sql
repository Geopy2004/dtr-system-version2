create extension if not exists pgcrypto;

create schema if not exists app_private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  department text,
  department_id uuid,
  shift_id uuid,
  position text,
  role text not null default 'employee',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'employee'))
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists department text,
  add column if not exists department_id uuid,
  add column if not exists shift_id uuid,
  add column if not exists position text,
  add column if not exists role text not null default 'employee',
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  manager_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null default '08:00',
  end_time time not null default '17:00',
  break_minutes integer not null default 60,
  grace_period_minutes integer not null default 15,
  expected_hours numeric(5,2) not null default 8,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_department_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_department_id_fkey
      foreign key (department_id) references public.departments(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_shift_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_shift_id_fkey
      foreign key (shift_id) references public.shifts(id) on delete set null;
  end if;
end
$$;

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  valid_from date not null default current_date,
  valid_to date,
  days_of_week integer[] not null default '{1,2,3,4,5}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  time_in timestamptz,
  time_out timestamptz,
  morning_time_in timestamptz,
  lunch_time_out timestamptz,
  lunch_time_in timestamptz,
  afternoon_time_out timestamptz,
  status text not null default 'present',
  late_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  undertime_minutes integer not null default 0,
  hours_worked numeric(8,2) not null default 0,
  location text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  source text not null default 'web',
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_user_date_key unique (user_id, date),
  constraint attendance_status_check check (
    status in ('present', 'late', 'absent', 'half-day', 'halfday', 'undertime', 'overtime', 'pending')
  )
);

alter table public.attendance
  add column if not exists morning_time_in timestamptz,
  add column if not exists lunch_time_out timestamptz,
  add column if not exists lunch_time_in timestamptz,
  add column if not exists afternoon_time_out timestamptz,
  add column if not exists overtime_minutes integer not null default 0,
  add column if not exists undertime_minutes integer not null default 0,
  add column if not exists location text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists source text not null default 'web',
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.attendance(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  event_time timestamptz not null default now(),
  ip_address text,
  user_agent text,
  device text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  total_days numeric(5,2) not null default 1,
  reason text,
  document_url text,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null unique,
  type text not null default 'Regular',
  is_paid boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  status text not null default 'success',
  description text,
  ip_address text,
  user_agent text,
  device text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'attendances'
  ) then
    execute 'create view public.attendances with (security_invoker = true) as select * from public.attendance';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'users'
  ) then
    execute 'create view public.users with (security_invoker = true) as select * from public.profiles';
  end if;
end
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
        and is_active = true
    );
$$;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role and not app_private.is_admin() then
    new.role = old.role;
  end if;

  if tg_op = 'UPDATE' and old.email is distinct from new.email and not app_private.is_admin() then
    new.email = old.email;
  end if;

  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, department, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'department', 'Unassigned'),
    coalesce(new.raw_app_meta_data ->> 'role', 'employee')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    department = coalesce(public.profiles.department, excluded.department);

  return new;
end;
$$;

create or replace function app_private.compute_attendance()
returns trigger
language plpgsql
as $$
declare
  start_at timestamptz;
  end_at timestamptz;
  shift_start timestamptz;
  morning_hours numeric := 0;
  afternoon_hours numeric := 0;
begin
  start_at := coalesce(new.morning_time_in, new.time_in);
  end_at := coalesce(new.afternoon_time_out, new.time_out);

  if start_at is not null then
    new.time_in = coalesce(new.time_in, start_at);
    new.morning_time_in = coalesce(new.morning_time_in, start_at);
    shift_start := date_trunc('day', start_at) + interval '8 hours 15 minutes';
    new.late_minutes := greatest(0, floor(extract(epoch from (start_at - shift_start)) / 60)::integer);
    if new.late_minutes > 0 and new.status <> 'absent' then
      new.status := 'late';
    elsif new.status in ('pending', 'late') and new.late_minutes = 0 then
      new.status := 'present';
    end if;
  end if;

  if end_at is not null then
    new.time_out = coalesce(new.time_out, end_at);
    new.afternoon_time_out = coalesce(new.afternoon_time_out, end_at);

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

    new.overtime_minutes := greatest(0, round((new.hours_worked - 8) * 60)::integer);
    new.undertime_minutes := greatest(0, round((8 - new.hours_worked) * 60)::integer);
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_updated_at') then
    create trigger profiles_updated_at
      before update on public.profiles
      for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'profiles_role_guard') then
    create trigger profiles_role_guard
      before update on public.profiles
      for each row execute function app_private.prevent_profile_role_escalation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function app_private.handle_new_user();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'attendance_compute') then
    create trigger attendance_compute
      before insert or update on public.attendance
      for each row execute function app_private.compute_attendance();
  end if;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'departments',
    'shifts',
    'schedules',
    'attendance',
    'attendance_logs',
    'leave_requests',
    'notifications',
    'holidays',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
  end loop;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_read') then
    create policy profiles_read on public.profiles
      for select to authenticated
      using (id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_self_insert') then
    create policy profiles_self_insert on public.profiles
      for insert to authenticated
      with check (id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_self_update') then
    create policy profiles_self_update on public.profiles
      for update to authenticated
      using (id = auth.uid() or app_private.is_admin())
      with check ((id = auth.uid() and role = 'employee') or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'departments' and policyname = 'departments_read') then
    create policy departments_read on public.departments
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'departments' and policyname = 'departments_admin_write') then
    create policy departments_admin_write on public.departments
      for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shifts' and policyname = 'shifts_read') then
    create policy shifts_read on public.shifts
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shifts' and policyname = 'shifts_admin_write') then
    create policy shifts_admin_write on public.shifts
      for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'schedules' and policyname = 'schedules_read') then
    create policy schedules_read on public.schedules
      for select to authenticated using (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'schedules' and policyname = 'schedules_admin_write') then
    create policy schedules_admin_write on public.schedules
      for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attendance' and policyname = 'attendance_read') then
    create policy attendance_read on public.attendance
      for select to authenticated using (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attendance' and policyname = 'attendance_insert') then
    create policy attendance_insert on public.attendance
      for insert to authenticated with check (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attendance' and policyname = 'attendance_update') then
    create policy attendance_update on public.attendance
      for update to authenticated
      using (user_id = auth.uid() or app_private.is_admin())
      with check (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attendance_logs' and policyname = 'attendance_logs_read') then
    create policy attendance_logs_read on public.attendance_logs
      for select to authenticated using (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attendance_logs' and policyname = 'attendance_logs_insert') then
    create policy attendance_logs_insert on public.attendance_logs
      for insert to authenticated with check (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leave_requests' and policyname = 'leave_requests_read') then
    create policy leave_requests_read on public.leave_requests
      for select to authenticated using (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leave_requests' and policyname = 'leave_requests_insert') then
    create policy leave_requests_insert on public.leave_requests
      for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leave_requests' and policyname = 'leave_requests_update') then
    create policy leave_requests_update on public.leave_requests
      for update to authenticated
      using (app_private.is_admin() or (user_id = auth.uid() and status = 'pending'))
      with check (app_private.is_admin() or (user_id = auth.uid() and status in ('pending', 'cancelled')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_read') then
    create policy notifications_read on public.notifications
      for select to authenticated using (user_id = auth.uid() or user_id is null or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update') then
    create policy notifications_update on public.notifications
      for update to authenticated
      using (user_id = auth.uid() or app_private.is_admin())
      with check (user_id = auth.uid() or app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_admin_write') then
    create policy notifications_admin_write on public.notifications
      for insert to authenticated with check (app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'holidays' and policyname = 'holidays_read') then
    create policy holidays_read on public.holidays
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'holidays' and policyname = 'holidays_admin_write') then
    create policy holidays_admin_write on public.holidays
      for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_logs' and policyname = 'activity_logs_read') then
    create policy activity_logs_read on public.activity_logs
      for select to authenticated using (
        actor_id = auth.uid()
        or target_user_id = auth.uid()
        or app_private.is_admin()
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_logs' and policyname = 'activity_logs_insert') then
    create policy activity_logs_insert on public.activity_logs
      for insert to authenticated with check (actor_id = auth.uid() or app_private.is_admin());
  end if;
end
$$;

insert into public.departments (name, code)
values
  ('Engineering', 'ENG'),
  ('Operations', 'OPS'),
  ('Human Resources', 'HR'),
  ('Finance', 'FIN')
on conflict (name) do nothing;

insert into public.shifts (name, start_time, end_time, break_minutes, grace_period_minutes)
values
  ('Core Day', '08:00', '17:00', 60, 15),
  ('Flex Morning', '07:00', '16:00', 60, 10),
  ('Support Swing', '13:00', '22:00', 60, 15)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('leave-documents', 'leave-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_images_read') then
    create policy profile_images_read on storage.objects
      for select to authenticated
      using (bucket_id = 'profile-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_images_insert') then
    create policy profile_images_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'profile-images' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_images_update') then
    create policy profile_images_update on storage.objects
      for update to authenticated
      using (bucket_id = 'profile-images' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()))
      with check (bucket_id = 'profile-images' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'leave_documents_read') then
    create policy leave_documents_read on storage.objects
      for select to authenticated
      using (bucket_id = 'leave-documents' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'leave_documents_insert') then
    create policy leave_documents_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'leave-documents' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'leave_documents_update') then
    create policy leave_documents_update on storage.objects
      for update to authenticated
      using (bucket_id = 'leave-documents' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()))
      with check (bucket_id = 'leave-documents' and ((storage.foldername(name))[1] = auth.uid()::text or app_private.is_admin()));
  end if;
end
$$;

grant usage on schema public to authenticated;
grant usage on schema app_private to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.attendances to authenticated;
grant select on public.users to authenticated;

alter table public.profiles replica identity full;
alter table public.attendance replica identity full;
alter table public.attendance_logs replica identity full;
alter table public.leave_requests replica identity full;
alter table public.notifications replica identity full;
alter table public.activity_logs replica identity full;

do $$
declare
  target_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target_table in array array[
      'profiles',
      'attendance',
      'attendance_logs',
      'leave_requests',
      'notifications',
      'activity_logs'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end loop;
  end if;
end
$$;
