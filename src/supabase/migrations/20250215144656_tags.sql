create table tags (
  id bigint primary key generated always as identity,
  app_id uuid not null references apps (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index tags_app_id_slug_idx on tags using btree (app_id, slug);
create index tags_app_id_idx on tags using btree (app_id, slug);

create table documents_tags (
  document_id bigint not null references documents (id) on delete cascade,
  tag_id bigint not null references tags (id) on delete cascade,
  primary key (document_id, tag_id)
);

create index documents_tags_document_id_idx on documents_tags using btree (document_id, tag_id);