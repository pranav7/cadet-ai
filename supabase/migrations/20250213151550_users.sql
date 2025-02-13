create table users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  app_id uuid references apps (id),
  auth_id uuid not null references auth.users (id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index on users using btree (email, auth_id);

create or replace function create_new_app_and_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_app_id uuid;
begin
  insert into apps (name, slug, created_by)
  values (
    new.raw_user_meta_data ->> 'app_name',
    new.raw_user_meta_data ->> 'app_slug',
    new.id
  )
  returning id into v_app_id;

  insert into users (email, first_name, last_name, auth_id, app_id)
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