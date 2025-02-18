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

  const { document_id, forceIdentifyTags, forceCreateSummary, forceSplitDocuments } = await req.json();

  const findDocumentQuery = supabase
    .from("documents")
    .select("*")
    .eq("id", Number(document_id))

  if (!forceIdentifyTags && !forceCreateSummary && !forceSplitDocuments) {
    console.log(`[Process] Finding unprocessed document ${document_id}`);
    findDocumentQuery.eq("processed", false);
  }

  const { data: document, error: selectError } = await findDocumentQuery.single();

  if (!document || selectError) {
    console.error(`[Process] ${selectError ? selectError.message : "Document not found or already processed"}`);

    return new Response(
      JSON.stringify({ error }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  try {
    await splitDocuments({ supabase, document, force: forceSplitDocuments });
    await createSummary({ supabase, document, force: forceCreateSummary });
    await identifyTags({ supabase, document, force: forceIdentifyTags });

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
