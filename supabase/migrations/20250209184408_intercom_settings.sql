create table if not exists private.intercom_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references basejump.accounts (id) on delete cascade,
  created_by uuid not null references auth.users (id) default auth.uid(),
  enabled boolean default false,
  api_key text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(account_id)
);

alter table private.intercom_settings enable row level security;

create policy "Users can manage their intercom settings"
  on private.intercom_settings
  for all
  using (
    auth.uid() in (
      select created_by
      from private.intercom_settings
      where account_id = intercom_settings.account_id
    )
  );

create trigger set_timestamp
  before update on private.intercom_settings
  for each row
  execute procedure basejump.trigger_set_timestamps();
