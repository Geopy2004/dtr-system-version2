alter table public.notifications
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'notifications_updated_at') then
    create trigger notifications_updated_at
      before update on public.notifications
      for each row execute function app_private.set_updated_at();
  end if;
end
$$;

grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists notifications_delete_admin_only on public.notifications;

create policy notifications_delete_admin_only
  on public.notifications
  for delete
  to authenticated
  using (app_private.is_admin());

notify pgrst, 'reload schema';
