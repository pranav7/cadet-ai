begin;

create extension if not exists "uuid-ossp";

create table apps (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references auth.users (id),

  constraint slug_must_be_lowercase check (slug = lower(slug)),
  constraint slug_must_be_unique unique (slug)
);

create unique index on apps using btree (slug);

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

commit;