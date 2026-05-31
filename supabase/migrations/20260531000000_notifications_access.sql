create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('info', 'success', 'warning', 'urgent'))
);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('info', 'success', 'warning', 'urgent'));
  end if;
end
$$;

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_global_created_at_idx
  on public.notifications (created_at desc)
  where user_id is null;

grant select, insert, update on public.notifications to authenticated;

drop policy if exists notifications_read on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_admin_write on public.notifications;
drop policy if exists notifications_select_own_global_or_admin on public.notifications;
drop policy if exists notifications_insert_admin_only on public.notifications;
drop policy if exists notifications_update_own_or_admin on public.notifications;

create policy notifications_select_own_global_or_admin
  on public.notifications
  for select
  to authenticated
  using (
    app_private.is_admin()
    or user_id = auth.uid()
    or user_id is null
  );

create policy notifications_insert_admin_only
  on public.notifications
  for insert
  to authenticated
  with check (app_private.is_admin());

create policy notifications_update_own_or_admin
  on public.notifications
  for update
  to authenticated
  using (
    app_private.is_admin()
    or user_id = auth.uid()
  )
  with check (
    app_private.is_admin()
    or user_id = auth.uid()
  );

alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when undefined_object then null;
  when duplicate_object then null;
end
$$;
