create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('admin@gmail.com', 'admin@company.com')
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
        and is_active = true
    );
$$;
