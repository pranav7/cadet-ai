import { createClient } from "@/utils/supabase/server";
import IntercomApi from "@/lib/intercom/api";
import { IntercomConversation } from "@/lib/intercom/types";
import { Sources } from "@/constants/sources";

async function processConversationsBatch(
  conversations: IntercomConversation[],
  userId: string
) {
  const supabase = await createClient();

  for (const conversation of conversations) {
    try {
      console.log(`[${conversation.id}] Starting processing`);

      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("source", Sources.Intercom)
        .eq("external_id", conversation.id)
        .maybeSingle();

      if (existing) {
        console.log(
          `[${conversation.id}] Found existing document for conversation, skipping ...`
        );
        continue;
      }

      console.log(`[${conversation.id}] Fetching conversation details`);
      const details = await IntercomApi.getConversationDetails(conversation.id);
      const content = IntercomApi.conversationToMarkdown(details);

      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          name: details.title || `Intercom conversation ${conversation.id}`,
          created_by: userId,
          content,
          source: Sources.Intercom,
          created_at: new Date(details.created_at * 1000).toISOString(),
          external_id: conversation.id,
        });

      if (insertError) {
        console.error(
          `[${conversation.id}] Failed to insert conversation:`,
          insertError
        );
      }

      console.log(`[${conversation.id}] Processed conversation`);
    } catch (error) {
      console.error(`[${conversation.id}] Processing error:`, error);
    }
  }
}

export async function importConversations(createdAfter?: Date) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user) {
    throw new Error("User not found");
  }

  console.log("Starting background import ...");
  backgroundImport(user.user.id, createdAfter);
  console.log("Background import started");

  return {
    success: true,
    message: "Import started in background. Check logs for progress."
  };
}

async function backgroundImport(userId: string, createdAfter?: Date) {
  let startingAfter: string | null = null;
  let totalProcessed = 0;

  console.log("Starting background import loop ...");
  try {
    while (true) {
      const { conversations, nextStartingAfter, totalCount } =
        await IntercomApi.getIntercomConversations(
          startingAfter,
          100,
          createdAfter,
        );

      if (conversations.length === 0) {
        console.log("No more conversations to process");
        break;
      }

      console.log("Processing batch of", conversations.length, "conversations");
      await processConversationsBatch(conversations, userId);

      totalProcessed += conversations.length;
      console.log(`Processed ${totalProcessed} of ${totalCount} conversations`);

      if (!nextStartingAfter) {
        break;
      }

      startingAfter = nextStartingAfter;
    }

    console.log(`Background import completed. Processed ${totalProcessed} conversations`);
  } catch (error) {
    console.error("Background import failed:", error);
  }
}
