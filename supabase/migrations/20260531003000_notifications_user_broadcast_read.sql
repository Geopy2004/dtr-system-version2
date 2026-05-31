drop policy if exists notifications_select_own_global_or_admin on public.notifications;

create policy notifications_select_own_global_or_admin
  on public.notifications
  for select
  to authenticated
  using (
    app_private.is_admin()
    or user_id = auth.uid()
    or user_id is null
    or metadata ->> 'audience' in ('all_employees', 'employees')
  );

create or replace function public.create_employee_notification(
  notification_title text,
  notification_message text,
  notification_type text default 'info'
)
returns setof public.notifications
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not app_private.is_admin() then
    raise exception 'Only administrators can create employee notifications.';
  end if;

  if nullif(btrim(notification_title), '') is null then
    raise exception 'Notification title is required.';
  end if;

  if nullif(btrim(notification_message), '') is null then
    raise exception 'Notification message is required.';
  end if;

  if notification_type not in ('info', 'success', 'warning', 'urgent') then
    raise exception 'Invalid notification type.';
  end if;

  return query
  insert into public.notifications (user_id, title, message, type, metadata)
  select
    profiles.id,
    btrim(notification_title),
    btrim(notification_message),
    notification_type,
    jsonb_build_object(
      'created_by', auth.uid(),
      'audience', 'all_employees'
    )
  from public.profiles
  where profiles.role is distinct from 'admin'
    and profiles.is_active is distinct from false
  returning public.notifications.*;
end;
$$;

grant execute on function public.create_employee_notification(text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
