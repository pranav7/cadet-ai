import { createClient } from "@/utils/supabase/server";
import IntercomApi from "@/lib/intercom/api";
import { IntercomConversation } from "@/lib/intercom/types";
import { Sources } from "@/constants/sources";
import { EndUserTypes } from "@/constants/end-user-types";

async function processConversationsBatch(
  conversations: IntercomConversation[],
  userId: string,
  appId: number
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

      const { data: document, error: insertError } = await supabase
        .from("documents")
        .insert({
          name: details.title || `Intercom conversation ${conversation.id}`,
          created_by: userId,
          content,
          source: Sources.Intercom,
          created_at: new Date(details.created_at * 1000).toISOString(),
          external_id: conversation.id,
          app_id: appId,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          `[${conversation.id}] Failed to insert conversation:`,
          insertError
        );
      }

      try {
        const contact_ids = details.contacts.contacts?.map((contact) => contact.id);
        console.log(`[${conversation.id}] Fetching contacts and teammates. Found ${contact_ids?.length} contacts`);
        const contacts = await Promise.all(contact_ids?.map(async (id) => IntercomApi.getIntercomContact(id)) || []);

        console.log(`[${conversation.id}] Inserting contacts`);
        await supabase.from("end_users").insert(contacts.map((contact) => ({
          email: contact.email,
          first_name: contact.name,
          last_name: contact.name,
          app_id: appId,
          type: EndUserTypes.user,
        })));

        if (document) {
          await supabase.from("end_user_documents").insert(contacts.map((contact) => ({
            end_user_id: contact.id,
            document_id: document.id,
          })));
        }
      } catch (error) {
        console.error(`[${conversation.id}] Error fetching contacts and teammates:`, error);
        console.log(`[${conversation.id}] Skipping creating contacts and teammates for this conversation`);
      }

      console.log(`[${conversation.id}] ✔️ Conversation imported!`);
    } catch (error) {
      console.error(`[${conversation.id}] Processing error:`, error);
    }
  }
}

export async function importConversations(userId: string, appId: number, createdAfter: Date = new Date("2024-01-01")) {
  console.log("Starting background import ...");
  backgroundImport(userId, appId, createdAfter);
  console.log("Background import started");

  return {
    success: true,
    message: "Import started in background. Check logs for progress."
  };
}

async function backgroundImport(userId: string, appId: number, createdAfter?: Date) {
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
      await processConversationsBatch(conversations, userId, appId);

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
