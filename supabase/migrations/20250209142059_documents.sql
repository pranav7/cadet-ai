create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table documents (
  id bigint primary key generated always as identity,
  name text not null,
  content text not null,
  source integer not null,
  metadata jsonb not null default '{}',
  external_id text not null,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (external_id)
);

CREATE UNIQUE INDEX documents_external_id_idx ON documents USING btree (external_id);

create table document_chunks (
  id bigint primary key generated always as identity,
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
  after insert on documents
  for each row
  execute procedure handle_document_insert();