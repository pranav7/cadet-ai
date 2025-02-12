import { IntercomConversation } from "../intercom-conversation-importer/types.ts";
import { conversationToMarkdown, getConversationDetails } from "../intercom-conversation-importer/intercom-api.ts";
import { Sources } from "../_lib/constants.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_lib/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

async function processConversationsBatch(
  conversations: IntercomConversation[],
  supabase: SupabaseClient,
  user_id: string,
) {
  for (const conversation of conversations) {
    try {
      console.log(`[${conversation.id}] Starting processing`);
      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("source", 1)
        .eq("external_id", conversation.id)
        .maybeSingle();

      if (existing) {
        console.log(
          `[${conversation.id}] Found existing document for conversation, skipping ...`,
        );
        continue;
      }

      console.log(`[${conversation.id}] Fetching conversation details`);
      const details = await Promise.race([
        getConversationDetails(conversation.id, supabase),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        ),
      ]) as IntercomConversation;

      const content = conversationToMarkdown(details);

      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          name: details.title || `Intercom conversation ${conversation.id}`,
          created_by: user_id,
          content,
          source: Sources.Intercom,
          created_at: new Date(details.created_at * 1000).toISOString(),
          external_id: conversation.id,
        });

      if (insertError) {
        console.error(
          `[${conversation.id}] Failed to insert conversation:`,
          insertError,
        );
      }

      console.log(`[${conversation.id}] Processed conversation`);
    } catch (error) {
      console.error(`[${conversation.id}] Processing error:`, error);
    }
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(
      JSON.stringify({ error: "No authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { authorization } },
    auth: { persistSession: false },
  });

  const { conversations, user_id } = await req.json();

  await processConversationsBatch(conversations, supabase, user_id);

  return new Response(
    JSON.stringify({ success: true, message: `Kicked off processing for ${conversations.length} conversations` }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
