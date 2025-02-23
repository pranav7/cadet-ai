create or replace function get_current_user()
returns users
language plpgsql
security definer
as $$
declare
  v_user users;
begin
  select * into v_user
  from public.users
  where auth_id = auth.uid()
  limit 1;

  return v_user;
end;
$$;

create or replace function get_current_app()
returns apps
language plpgsql
security definer
as $$
declare
  v_app apps;
begin
  select a.* into v_app
  from public.apps a
  join public.users u on u.app_id = a.id
  where u.auth_id = auth.uid()
  limit 1;

  return v_app;
end;
$$;
