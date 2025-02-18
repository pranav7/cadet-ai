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
    .rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: 10,
      created_after_date: createdAfterDate?.toISOString() || null
    });

  const { data: documents, error: matchError } = await dbQuery;

  if (matchError) {
    console.log("matchError", matchError);

    return {
      error: "There was an error reading your documents, please try again.",
    };
  }

  return {
    documents,
    injectableDocuments: documents.map((doc: { content: string }) => doc.content).join("\n\n"),
  };
}

async function _generateEmbedding(message: string) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: message,
  });

  return embedding;
}
