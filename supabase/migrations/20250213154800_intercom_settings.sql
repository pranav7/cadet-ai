begin;

create table if not exists intercom_settings (
  id bigint primary key generated always as identity,
  app_id uuid not null references apps (id),
  created_by uuid not null references users (id),
  api_key text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(created_by)
);

commit;