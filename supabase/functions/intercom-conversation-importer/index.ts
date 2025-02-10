import { createClient } from "@supabase/supabase-js";
import {
  conversationToMarkdown,
  getConversationDetails,
  getIntercomConversations,
} from "./intercom-api.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

const BATCH_SIZE = 50;
const MAX_BATCHES = 5;

Deno.serve(async (req: Request): Promise<Response> => {
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

  const { user_id, created_after } = await req.json();
  const createdAfterDate = created_after ? new Date(created_after) : undefined;

  const { data: settings, error: settingsError } = await supabase
    .from("intercom_settings")
    .select("*")
    .single();

  if (settingsError || !settings?.api_key) {
    throw new Error("Intercom not configured or enabled for this account", {
      cause: JSON.stringify(settingsError),
    });
  }

  EdgeRuntime.waitUntil((async () => {
    let totalProcessed = 0;
    let startingAfter: string | null = null;
    let batchCount = 0;

    try {
      while (batchCount < MAX_BATCHES) {
        const { conversations, nextStartingAfter } =
          await getIntercomConversations(
            settings.api_key,
            startingAfter,
            BATCH_SIZE,
            createdAfterDate,
          );

        for (const conversation of conversations) {
          console.log(`[${conversation.id}] Processing conversation`);
          console.log(`[${conversation.id}] Finding existing documents if any`);
          const { data: existing } = await supabase
            .from("documents")
            .select("id")
            .eq("source", 1)
            .eq("metadata->external_id", conversation.id)
            .maybeSingle();

          if (existing) {
            console.log(
              `[${conversation.id}] Found existing document for conversation, skipping ...`,
            );
            continue;
          }

          console.log(`[${conversation.id}] Fetching conversation details`);
          const details = await getConversationDetails(
            settings.api_key,
            conversation.id,
          );

          console.log(
            `[${conversation.id}] Converting conversation to markdown`,
          );
          const content = conversationToMarkdown(details);

          console.log(
            `[${conversation.id}] Inserting conversation into database`,
          );
          const { error: insertError } = await supabase
            .from("documents")
            .insert({
              name: details.title || `Intercom conversation ${conversation.id}`,
              created_by: user_id,
              content,
              source: 1,
              created_at: new Date(details.created_at * 1000).toISOString(),
              metadata: {
                external_id: conversation.id,
                created_at: details.created_at,
                updated_at: details.updated_at,
              },
            });

          if (insertError) {
            console.error(
              `[${conversation.id}] Failed to insert conversation:`,
              insertError,
            );
          } else {
            totalProcessed++;
          }
        }

        if (!nextStartingAfter) break;
        startingAfter = nextStartingAfter;
        batchCount++;

        // Store the cursor for the next run
        await supabase
          .from("import_cursors")
          .upsert({
            user_id,
            cursor: nextStartingAfter,
            last_processed: new Date().toISOString(),
          });
      }

      // If there's more data to process, schedule the next run
      if (startingAfter) {
        await fetch(
          `${supabaseUrl}/functions/v1/intercom-conversation-importer`,
          {
            method: "POST",
            headers: {
              "Authorization": authorization,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id }),
          },
        );
      }

      console.log(
        `Batch completed. Processed ${totalProcessed} conversations.`,
      );
    } catch (error) {
      console.error("Background task failed:", error);
    }
  })());

  // Return immediately while processing continues in the background
  return new Response(
    JSON.stringify({
      success: true,
      message: "Import started in background",
    }),
    { status: 202, headers: { "Content-Type": "application/json" } },
  );
});

addEventListener("beforeunload", (event) => {
  console.log("Function will be shutdown due to", event);
});

/* To invoke locally:
  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/intercom-conversation-importer' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"user_id": "1e6c6180-dadc-4c22-8a5c-3ea605bc6da6", "created_after": "2024-01-01"}'
*/
