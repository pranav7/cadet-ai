import { createClient } from "@/utils/supabase/server";
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function searchDocuments({
  searchQuery,
  matchThreshold = 0.8,
  createdAfterDate,
}: {
  searchQuery: string;
  matchThreshold?: number;
  createdAfterDate?: Date;
}) {
  const supabase = await createClient();
  const embedding = await _generateEmbedding(searchQuery);
  const dbQuery = supabase
    .from('document_chunks')
    .select('content')
    .lt('embedding <=> ?', embedding)
    .gt('embedding <=> ?', -matchThreshold)
    .order('embedding <=> ?', { ascending: true });

  if (createdAfterDate) {
    dbQuery.gt('created_at', createdAfterDate.toISOString());
  }

  const { data: documents, error: matchError } = await dbQuery.limit(10);

  if (matchError) {
    console.log("matchError", matchError);
    return {
      error: "There was an error reading your documents, please try again.",
    };
  }

  return {
    documents,
    injectableDocuments: documents.map(({ content }) => content).join("\n\n"),
  };
}

async function _generateEmbedding(message: string) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: message,
  });

  return embedding;
}
