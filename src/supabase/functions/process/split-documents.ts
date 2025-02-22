import { Tables } from "../_lib/database.types.ts";
import { TextSplitter } from "../_lib/text-splitter.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export const splitDocuments = async ({
  supabase,
  document,
  force,
}: {
  supabase: SupabaseClient;
  document: Tables<"documents">;
  force: boolean;
}) => {
  const { data: existingDocumentChunks } = await supabase
    .from("document_chunks")
    .select()
    .eq("document_id", document.id);

  if (existingDocumentChunks && !force) {
    console.log(`[Process] Document ${document.id} already has chunks`);

    return;
  }

  const splitter = new TextSplitter();
  const chunks = await splitter.split(document.content);

  const { data: documentChunks, error: insertError } = await supabase
    .from("document_chunks")
    .insert(chunks.map((chunk) => ({
      document_id: document.id,
      app_id: document.app_id,
      content: chunk,
    })))
    .select();

  console.log(
    `[Process] Saved ${documentChunks?.length} chunks for document ${document.id}`,
  );

  if (insertError) {
    console.error(insertError);

    throw new Error("Failed to split documents");
  }

  return documentChunks;
};