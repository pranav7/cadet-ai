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

create or replace function create_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Add defensive checks for required metadata
  if new.raw_user_meta_data is null or
     new.raw_user_meta_data ->> 'first_name' is null or
     new.raw_user_meta_data ->> 'last_name' is null then
    raise warning 'Missing required metadata for user creation. Raw metadata: %', new.raw_user_meta_data;
    return new;
  end if;

  -- Add defensive check for email
  if new.email is null then
    raise warning 'Missing email for user creation';
    return new;
  end if;

  begin
    insert into users (email, first_name, last_name, auth_id)
    values (
      new.email,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      new.id
    );
  exception
    when unique_violation then
      raise warning 'User already exists with email % for auth_id %', new.email, new.id;
      return new;
    when others then
      raise warning 'Error creating user: % %', SQLERRM, SQLSTATE;
      return new;
  end;

  return new;
end;
$$;

create or replace function set_app_id()
returns trigger
language plpgsql
security definer
as $$
declare
  app_id uuid;
begin
  select id into app_id from apps where created_by = new.auth_id;
  if app_id is null then
    raise exception 'No app found for auth_id %', new.auth_id;
  end if;
  update users set app_id = app_id where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created_create_user
  after insert on auth.users
  for each row execute procedure create_new_user();

create trigger on_user_insert_set_app_id
  after insert on users
  for each row execute procedure set_app_id();
