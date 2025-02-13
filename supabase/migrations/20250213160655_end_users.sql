begin;

create table end_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  app_id uuid not null references apps (id),
  type integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index on end_users using btree (email, app_id);

create table end_user_documents (
  id uuid primary key default uuid_generate_v4(),
  end_user_id uuid not null references end_users (id),
  document_id bigint not null references documents (id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index on end_user_documents using btree (end_user_id, document_id);

commit;