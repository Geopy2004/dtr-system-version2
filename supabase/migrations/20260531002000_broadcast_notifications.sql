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
  where profiles.role <> 'admin'
    and profiles.is_active is true
  returning public.notifications.*;
end;
$$;

grant execute on function public.create_employee_notification(text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
