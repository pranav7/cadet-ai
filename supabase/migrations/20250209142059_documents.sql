create schema private;

create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table private.documents (
  id bigint primary key generated always as identity,
  name text not null,
  account_id uuid not null references basejump.accounts (id),
  content text not null,
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create table private.document_chunks (
  id bigint primary key generated always as identity,
  account_id uuid not null references basejump.accounts (id),
  document_id bigint not null references private.documents (id) on delete cascade,
  content text not null,
  embedding vector(384),
  created_at timestamp with time zone not null default now()
);

create index on private.document_chunks using hnsw (embedding vector_ip_ops);

alter table private.documents enable row level security;
alter table private.document_chunks enable row level security;

create policy "Users can query their team's documents"
on private.documents for select to authenticated using (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.documents.account_id
  )
);

create policy "Users can query their team's document chunks"
on private.document_chunks for select to authenticated using (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.document_chunks.account_id
  )
);

create policy "Users can insert documents"
on private.documents for insert to authenticated with check (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.documents.account_id
  )
);

create policy "Users can insert document chunks"
on private.document_chunks for insert to authenticated with check (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.document_chunks.account_id
  )
);

create policy "Users can update their documents"
on private.documents for update to authenticated using (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.documents.account_id
  )
);

create policy "Users can update their document chunks"
on private.document_chunks for update to authenticated using (
  auth.uid() in (
    select created_by
    from private.documents
    where account_id = private.document_chunks.account_id
  )
);