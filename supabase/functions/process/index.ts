import { createClient } from "@supabase/supabase-js";
import { TextSplitter } from "../_lib/text-splitter.ts";
import { corsHeaders } from "../_lib/cors.ts";

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

  const splitter = new TextSplitter();
  const chunks = await splitter.split(document.content);

  const { data: document_chunks, error } = await supabase
    .from("document_chunks")
    .insert(chunks.map((chunk) => ({
      document_id,
      content: chunk,
    })))
    .select();

  console.log(
    `Saved ${document_chunks?.length} chunks for document ${document_id}`,
  );

  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Failed to save document chunks" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  return new Response(null, {
    status: 204,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
