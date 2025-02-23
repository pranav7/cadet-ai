import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@/supabase/functions/_lib/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
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

  const { data: documentChunks } = await supabase
    .from('document_chunks')
    .select('id')
    .is('embedding', null)

  if (documentChunks) {
    const batchSize = 50;

    for (let i = 0; i < documentChunks.length; i += batchSize) {
      const batch = documentChunks.slice(i, i + batchSize);
      await supabase.functions.invoke('embed', {
        body: JSON.stringify({
          ids: batch.map((chunk) => chunk.id),
          table: 'document_chunks',
          contentColumn: 'content',
          embeddingColumn: 'embedding',
        }),
      });
    }
  }

  return new Response(null, {
    status: 204,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
})