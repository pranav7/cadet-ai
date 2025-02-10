create table if not exists intercom_settings (
  id bigint primary key generated always as identity,
  created_by uuid not null references auth.users (id) default auth.uid(),
  api_key text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
);