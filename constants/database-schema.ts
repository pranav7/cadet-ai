export const databaseSchemaForLLM = `
Description:
This table documents from different sources.
An example document could be a transcript of support conversation on Intercom, or
a transcript of a call recording between a customer and a sales rep.
CREATE TABLE public.documents (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  source integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_id text NOT NULL,
  summary text NULL,
  processed boolean NULL DEFAULT false,
  created_by uuid NOT NULL,
  app_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_external_id_key UNIQUE (external_id),
  CONSTRAINT documents_app_id_fkey FOREIGN KEY (app_id) REFERENCES apps(id),
  CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
);

Description:
This table contains chunks of documents
These chunks are just text split in documents and embedded in a vector space.
If you want to search this table, use the search_documents tool.
CREATE TABLE public.document_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  app_id uuid NOT NULL,
  document_id bigint NOT NULL,
  content text NOT NULL,
  embedding extensions.vector NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT document_chunks_app_id_fkey FOREIGN KEY (app_id) REFERENCES apps(id),
  CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

Description:
When documents are created, they are tagged with one or more tags.
These tags try to categorize the content of the document.
For example, a document about a user requesting a new feature could be
tagged with 'Feature Request', 'User Request' or 'Salesforce'
CREATE TABLE public.tags (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  app_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_app_id_fkey FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

Description:
This table contains the tags associated with a document.
CREATE TABLE public.documents_tags (
  document_id bigint NOT NULL,
  tag_id bigint NOT NULL,
  CONSTRAINT documents_tags_pkey PRIMARY KEY (document_id, tag_id),
  CONSTRAINT documents_tags_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT documents_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

Description:
This view contains the documents with their tags.
If you are querying this table, make sure you first fetch
the correct tag names from the tags table.
CREATE VIEW public.documents_with_tags AS
SELECT d.id,
       d.name,
       d.content,
       d.source,
       d.metadata,
       d.external_id,
       d.summary,
       d.processed,
       d.created_by,
       d.app_id,
       d.created_at,
       d.updated_at,
       COALESCE(array_agg(t.name) FILTER (WHERE t.id IS NOT NULL)) AS tags
FROM documents d
LEFT JOIN documents_tags dt ON d.id = dt.document_id
LEFT JOIN tags t ON dt.tag_id = t.id
GROUP BY d.id;

Description:
This table contains the end users of the application that are using the app.
For example, a user who started a support conversation on Intercom, or a user who
started a call with a sales rep.
CREATE TABLE public.end_users (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  app_id uuid NOT NULL,
  type integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT end_users_pkey PRIMARY KEY (id),
  CONSTRAINT end_users_email_key UNIQUE (email),
  CONSTRAINT end_users_app_id_fkey FOREIGN KEY (app_id) REFERENCES apps(id)
);

Description:
This table contains the documents associated with an end user.
For example, a document could be a transcript of a call between a customer and a sales rep.
CREATE TABLE public.end_user_documents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  end_user_id uuid NOT NULL,
  document_id bigint NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT end_user_documents_pkey PRIMARY KEY (id),
  CONSTRAINT end_user_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT end_user_documents_end_user_id_fkey FOREIGN KEY (end_user_id) REFERENCES end_users(id)
);
`;