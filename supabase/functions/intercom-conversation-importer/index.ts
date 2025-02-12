import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getIntercomConversations,
} from "./intercom-api.ts";
import { corsHeaders } from '../_lib/cors.ts'

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

async function importIntercomConversations(user_id: string, created_after: string, resume_from: string, supabase: SupabaseClient) {
  const createdAfterDate = created_after ? new Date(created_after) : new Date("2024-01-01");
  let startingAfter = resume_from || null;

  while (true) {
    console.log(
      `Fetching conversations starting after: ${startingAfter || "beginning"}`,
    );

    const { conversations, nextStartingAfter } =
      await getIntercomConversations(
        supabase,
        startingAfter,
        100,
        createdAfterDate,
      );

    if (conversations.length === 0) {
      console.log("No more conversations to process");
      break;
    }

    supabase.functions.invoke("intercom-conversations-batch-processor", {
      body: {
        conversations,
        user_id,
      },
      method: "POST",
    });

    startingAfter = nextStartingAfter;

    if (!nextStartingAfter) {
      console.log("Reached end of conversations");
      break;
    }
  }

  console.log(
    `Import complete!`,
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(
      JSON.stringify({ error: "No authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { authorization } },
    auth: { persistSession: false },
  });

  const { user_id, created_after, resume_from } = await req.json();

  await importIntercomConversations(user_id, created_after, resume_from, supabase);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Import completed",
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});

addEventListener("beforeunload", (event) => {
  console.log("Function will be shutdown due to", event);
});