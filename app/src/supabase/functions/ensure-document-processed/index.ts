import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@/supabase/functions/_lib/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(JSON.stringify({ error: "No authorization header passed" }), { status: 500, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { forceIdentifyTags, forceCreateSummary, forceSplitDocuments } = await req.json();

  console.log(`[Ensure Document Processed] Force identify tags: ${forceIdentifyTags}, force create summary: ${forceCreateSummary}, force split documents: ${forceSplitDocuments}`);

  const query = supabase
    .from('documents')
    .select('id')

  if (!forceIdentifyTags && !forceCreateSummary && !forceSplitDocuments) {
    query.is('processed', false);
  }

  const { data: documents } = await query;

  if (documents) {
    console.log(`[Ensure Document Processed] Found ${documents.length} documents to process`);

    // Process in batches of 10
    for (let i = 0; i < documents.length; i += 10) {
      const batch = documents.slice(i, i + 10);

      await Promise.all(batch.map(document =>
        supabase.functions.invoke('process', {
          body: JSON.stringify({
            document_id: document.id,
            forceIdentifyTags,
            forceCreateSummary,
            forceSplitDocuments
          }),
        })
      ));

      console.log(`[Ensure Document Processed] Processed batch ${i/10 + 1} of ${Math.ceil(documents.length/10)}`);
    }

    console.log(`[Ensure Document Processed] Completed processing ${documents.length} documents`);
  }

  return new Response(null, { status: 204, headers: corsHeaders })
})