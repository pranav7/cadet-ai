import { corsHeaders } from "../_lib/cors.ts";
import { createSupabaseClient } from "../_lib/supabase-client.ts";
import { createSummary } from "./create-summary.ts";
import { identifyTags } from "./identify-tags.ts";
import { splitDocuments } from "./split-documents.ts";
import { SupabaseClient } from "@supabase/supabase-js";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseClient(req);
  } catch (error) {
    console.error('[Process] Failed to create supabase client:', error);
    return new Response(
      JSON.stringify({ error: "Failed to create supabase client" }),
      { status: 500, headers: corsHeaders },
    );
  }

  const { document_id } = await req.json();

  const { data: document, error: selectError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", Number(document_id))
    .eq("processed", false)
    .single();

  if (selectError) {
    console.error('[Process] Error selecting document:', selectError);
  }

  if (!document) {
    const error = "Document not found or already processed";
    console.error(`[Process] ${error}`);
    return new Response(
      JSON.stringify({ error }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  try {
    await splitDocuments(supabase, document);
    await createSummary(supabase, document);
    await identifyTags(supabase, document);

    const { error: updateError } = await supabase
      .from("documents")
      .update({ processed: true })
      .eq("id", document_id);

    if (updateError) {
      console.error('[Process] Error updating document processed status:', updateError);
      throw updateError;
    }

    return new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error('[Process] Processing failed:', error);

    const { error: revertError } = await supabase
      .from("documents")
      .update({ processed: false })
      .eq("id", document_id);

    if (revertError) {
      console.error('[Process] Error reverting processed status:', revertError);
    }

    return new Response(
      JSON.stringify({ error: "Processing failed" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
