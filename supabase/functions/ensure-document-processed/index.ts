import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_lib/cors.ts";

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

  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .is('processed', false)

  if (documents) {
    for (const document of documents) {
      supabase.functions.invoke('process', {
        body: JSON.stringify({ document_id: document.id }),
      });
    }
  }

  return new Response(null, { status: 204, headers: corsHeaders })
})