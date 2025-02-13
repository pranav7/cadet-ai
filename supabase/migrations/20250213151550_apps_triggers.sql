begin;

create or replace function create_new_app_and_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_app_id uuid;
begin
  insert into public.apps (name, slug, created_by)
  values (
    new.raw_user_meta_data ->> 'app_name',
    new.raw_user_meta_data ->> 'app_slug',
    new.id
  )
  returning id into v_app_id;

  perform pg_notify('app_created', v_app_id::text);
  perform pg_sleep(1);
  insert into public.users (email, first_name, last_name, auth_id, app_id)
  values (
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.id,
    v_app_id
  );

  return new;
exception
  when others then
    raise warning 'Error in create_new_app_and_user: % %', SQLERRM, SQLSTATE;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_new_app_and_user();

commit;