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