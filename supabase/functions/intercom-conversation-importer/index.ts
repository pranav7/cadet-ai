import { createClient } from "@supabase/supabase-js";
import {
  conversationToMarkdown,
  getConversationDetails,
  getIntercomConversations,
} from "./intercom-api.ts";
import { IntercomConversation } from "./types.ts";
import { Sources } from "../_lib/constants.ts";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

const BATCH_SIZE = 10;
const DELAY_BETWEEN_CONVERSATIONS = 1000; // 1 second delay

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

  const { user_id, created_after, resume_from } = await req.json();
  const createdAfterDate = created_after ? new Date(created_after) : new Date("2024-01-01");
  let startingAfter = resume_from || null;

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

    // Keep fetching while we have more pages
    while (true) {
      console.log(
        `Fetching batch starting after: ${startingAfter || "beginning"}`,
      );

      const { conversations, nextStartingAfter } =
        await getIntercomConversations(
          settings.api_key,
          startingAfter,
          BATCH_SIZE,
          createdAfterDate,
        );

      // If no conversations returned, we're done
      if (conversations.length === 0) {
        console.log("No more conversations to process");
        break;
      }

      // Process conversations in this batch
      for (const conversation of conversations) {
        try {
          console.log(`[${conversation.id}] Processing conversation`);
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
            getConversationDetails(settings.api_key, conversation.id),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 10000)
            ),
          ]) as IntercomConversation;

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
              source: Sources.Intercom,
              created_at: new Date(details.created_at * 1000).toISOString(),
              external_id: conversation.id,
            });

          if (insertError) {
            console.error(
              `[${conversation.id}] Failed to insert conversation:`,
              insertError,
            );
          } else {
            totalProcessed++;
          }

          console.log(`[${conversation.id}] Processed conversation`);
          console.log(
            `[${conversation.id}] Total processed: ${totalProcessed}`,
          );

          // Add delay between processing conversations
          console.log(
            `💤 Sleeping for ${DELAY_BETWEEN_CONVERSATIONS}ms`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_CONVERSATIONS)
          );

          // Store the cursor periodically
          const { error: cursorError } = await supabase
            .from("import_cursors")
            .upsert({
              user_id,
              type: "intercom",
              cursor: startingAfter,
              updated_at: new Date().toISOString(),
            });

          if (cursorError) {
            console.error("Failed to save cursor:", cursorError);
          }
        } catch (error: any) {
          console.error("Batch processing error:", error);
          return new Response(
            JSON.stringify({
              success: false,
              resume_from: startingAfter,
              error: error.message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      // Update cursor for next batch
      startingAfter = nextStartingAfter;

      // If no next cursor, we've reached the end
      if (!nextStartingAfter) {
        console.log("Reached end of conversations");
        break;
      }
    }

    console.log(
      `Import complete. Total conversations processed: ${totalProcessed}`,
    );
  })());

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
    --data '{"user_id": "21699cd3-7a34-4ab2-8a7d-c0d57c4f23ea", "created_after": "2024-01-01"}'
*/
