create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  created_after_date timestamptz default null
)
returns table (
  content text,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.content,
    document_chunks.created_at
  from document_chunks
  where document_chunks.embedding <=> query_embedding < match_threshold
    and (
      created_after_date is null
      or document_chunks.created_at > created_after_date
    )
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;