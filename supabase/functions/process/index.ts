import { corsHeaders } from "../_lib/cors.ts";
import { createSupabaseClient } from "../_lib/supabase-client.ts";
import { createSummary } from "./create-summary.ts";
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
    console.error(error);

    return new Response(
      JSON.stringify({ error: "Failed to create supabase client" }),
      { status: 500, headers: corsHeaders },
    );
  }

  const { document_id } = await req.json();
  const { data: document } = await supabase
    .from("documents")
    .select()
    .eq("id", document_id)
    .single();

  if (!document) {
    return new Response(
      JSON.stringify({ error: "Failed to find uploaded document" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  try {
    await splitDocuments(supabase, document);
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({ error: "Failed to split documents" }),
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    await createSummary(supabase, document);
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({ error: "Failed to create summary" }),
      { status: 500, headers: corsHeaders },
    );
  }

  return new Response(null, {
    status: 204,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
