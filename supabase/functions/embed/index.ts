import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_lib/cors.ts";
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

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

  const { ids, table, contentColumn, embeddingColumn } = await req.json();

  const { data: rows, error: selectError } = await supabase
    .from(table)
    .select(`id, ${contentColumn}` as "*")
    .in("id", ids)
    .is(embeddingColumn, null);

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  for (const row of rows) {
    const { id, [contentColumn]: content } = row;

    if (!content) {
      console.error(`[Embed] No content available in column '${contentColumn}'`);
      continue;
    }

    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: content,
    });

    console.log(embedding);

    const { error } = await supabase
      .from(table)
      .update({
        [embeddingColumn]: JSON.stringify(embedding),
      })
      .eq("id", id);

    if (error) {
      console.error(
        `[Embed] Failed to save embedding on '${table}' table with id ${id}`,
      );
    }

    console.log(
      `[Embed] Generated embedding ${
        JSON.stringify({
          table,
          id,
          contentColumn,
          embeddingColumn,
        })
      }`,
    );
  }

  return new Response(null, {
    status: 204,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
