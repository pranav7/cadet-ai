import { createClient } from "@supabase/supabase-js";
import { processMarkdown } from "../_lib/markdown-parser.ts";

// These are automatically injected
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
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
    .from("private.documents")
    .select()
    .eq("id", document_id)
    .single();

  if (!document) {
    return new Response(
      JSON.stringify({ error: "Failed to find uploaded document" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const processedMd = processMarkdown(document.content);

  const { error } = await supabase.from("private.document_sections").insert(
    processedMd.sections.map(({ content }) => ({
      document_id,
      content,
    })),
  );

  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Failed to save document sections" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  console.log(
    `Saved ${processedMd.sections.length} sections for file '${document.name}'`,
  );

  return new Response(null, {
    status: 204,
    headers: { "Content-Type": "application/json" },
  });
});
