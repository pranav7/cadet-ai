create schema private;

create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table private.documents (
  id bigint primary key generated always as identity,
  name text not null,
  account_id uuid not null references basejump.accounts (id),
  content text not null,
  source integer not null,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table private.document_chunks (
  id bigint primary key generated always as identity,
  account_id uuid not null references basejump.accounts (id),
  document_id bigint not null references private.documents (id) on delete cascade,
  content text not null,
  embedding vector(384),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index on private.document_chunks using hnsw (embedding vector_ip_ops);

alter table private.documents enable row level security;
alter table private.document_chunks enable row level security;

create policy "Users can query their account's documents"
on private.documents for select to authenticated using (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create policy "Users can query their account's document chunks"
on private.document_chunks for select to authenticated using (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create policy "Users can insert documents"
on private.documents for insert to authenticated with check (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create policy "Users can insert document chunks"
on private.document_chunks for insert to authenticated with check (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create policy "Users can update their documents"
on private.documents for update to authenticated using (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create policy "Users can update their document chunks"
on private.document_chunks for update to authenticated using (
  (select account_id from auth.users where id = auth.uid()) = account_id
);

create function supabase_url()
returns text
language plpgsql
security definer
as $$
declare
  secret_value text;
begin
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'supabase_url';
  return secret_value;
end;
$$;

create function private.handle_document_insert()
returns trigger
language plpgsql
as $$
begin
  perform net.http_post(
    url := supabase_url() || '/functions/v1/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', current_setting('request.headers')::json->>'authorization'
    ),
    body := jsonb_build_object(
      'document_id', new.id
    )
  );

  return new;
end;
$$;

create trigger on_document_insert
  after insert on private.documents
  for each row
  execute procedure private.handle_document_insert();