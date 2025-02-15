create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table documents (
  id bigint primary key generated always as identity,
  name text not null,
  content text not null,
  source integer not null,
  metadata jsonb not null default '{}',
  external_id text not null,
  summary text,
  processed boolean default false,
  created_by uuid not null references users (id),
  app_id uuid not null references apps (id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (external_id)
);

create unique index documents_external_id_idx on documents using btree (external_id);

create table document_chunks (
  id bigint primary key generated always as identity,
  app_id uuid not null references apps (id),
  document_id bigint not null references documents (id) on delete cascade,
  content text not null,
  embedding vector(384),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index on document_chunks using hnsw (embedding vector_ip_ops);

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

create function handle_document_insert()
returns trigger
language plpgsql
as $$
declare
  result int;
begin
  select
    net.http_post(
      url := supabase_url() || '/functions/v1/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object(
        'document_id', new.id
      )
    )
  into result;

  return null;
end;
$$;

create trigger handle_document_insert_trigger
  after insert on documents
  for each row
  execute procedure handle_document_insert();