import { Tables } from "../_lib/database.ts";
import { TextSplitter } from "../_lib/text-splitter.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export const splitDocuments = async (
  supabase: SupabaseClient,
  document: Tables<"documents">,
) => {
  const splitter = new TextSplitter();
  const chunks = await splitter.split(document.content);

  const { data: document_chunks, error } = await supabase
    .from("document_chunks")
    .insert(chunks.map((chunk) => ({
      document_id: document.id,
      app_id: document.app_id,
      content: chunk,
    })))
    .select();

  console.log(
    `[Process] Saved ${document_chunks?.length} chunks for document ${document.id}`,
  );

  if (error) {
    console.error(error);

    throw new Error("Failed to split documents");
  }

  return document_chunks;
};