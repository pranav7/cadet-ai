begin;

-- Enable required extensions first
create extension if not exists "uuid-ossp";

-- Apps and Users tables --

create table apps (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  auth_id uuid not null references auth.users (id),

  constraint slug_must_be_lowercase check (slug = lower(slug)),
  constraint slug_must_be_unique unique (slug)
);

create unique index on apps using btree (slug);

create table users (
    id uuid primary key default uuid_generate_v4(),
    email text not null unique,
    first_name text not null,
    last_name text not null,
    app_id uuid not null references apps (id),
    auth_id uuid not null references auth.users (id),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create unique index on users using btree (email, auth_id);

-- Functions and triggers --

create or replace function handle_new_app()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into apps (name, slug, auth_id)
  values (
    new.raw_user_meta_data ->> 'app_name',
    new.raw_user_meta_data ->> 'app_slug',
    new.id
  );
  return new;
end;
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  app_id uuid;
begin
  -- Wait a short moment to ensure app is created first
  perform pg_sleep(0.1);
  select id into app_id from apps where auth_id = new.id;

  if app_id is null then
    raise exception 'No app found for auth_id %', new.id;
  end if;

  insert into users (email, first_name, last_name, app_id, auth_id)
  values (
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    app_id,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_app on auth.users;
drop trigger if exists on_auth_user_created_create_user on auth.users;

create trigger on_auth_user_created_create_app
  after insert on auth.users
  for each row execute procedure handle_new_app();

create trigger on_auth_user_created_create_user
  after insert on auth.users
  for each row execute procedure handle_new_user();

commit;
