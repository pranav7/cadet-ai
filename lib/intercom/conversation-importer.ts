import { createClient } from "@/utils/supabase/server";
import IntercomApi from "@/lib/intercom/api";
import { IntercomConversation, IntercomUser } from "@/lib/intercom/types";
import { Sources } from "@/constants/sources";
import { EndUserTypes } from "@/constants/end-user-types";
import { chunk } from '@/utils/array';

export async function importConversations({
  userId,
  appId,
  createdAfter = new Date("2024-01-01"),
  limit,
}: {
  userId: string,
  appId: number,
  createdAfter?: Date,
  limit?: number,
}) {
  console.log("[importConversations] Starting import...");

  await backgroundImport({ userId, appId, createdAfter, limit });

  return {
    success: true,
    message: "Import started in background. Check logs for progress.",
  };
}

async function backgroundImport({
  userId,
  appId,
  createdAfter,
  limit,
}: {
  userId: string,
  appId: number,
  createdAfter: Date,
  limit?: number,
}) {
  let startingAfter: string | null = null;
  let totalProcessed = 0;

  try {
    while (true) {
      const { conversations, nextStartingAfter } =
        await IntercomApi.getIntercomConversations({
          startingAfter,
          batchSize: 25,
          createdAfter,
        });

      if (conversations.length === 0) break;

      await processConversationsBatch({ conversations, userId, appId });
      await new Promise(resolve => setTimeout(resolve, 1000));

      totalProcessed += conversations.length;
      if (limit && totalProcessed >= limit) break;
      if (!nextStartingAfter) break;

      startingAfter = nextStartingAfter;
    }
  } catch (error) {
    console.error("[backgroundImport] Import failed:", error);
  }
}

async function processConversationsBatch({
  conversations,
  userId,
  appId,
}: {
  conversations: IntercomConversation[],
  userId: string,
  appId: number,
}) {
  const batches = chunk(conversations, 5);

  for (const batchConversations of batches) {
    await Promise.all(batchConversations.map(async (conversation) => {
      try {
        const supabase = await createClient();
        const { data: existing } = await supabase
          .from("documents")
          .select("id")
          .eq("source", Sources.Intercom)
          .eq("external_id", conversation.id)
          .maybeSingle();

        if (existing) return;

        const details = await IntercomApi.getConversationDetails({
          conversationId: conversation.id,
        });

        let content = IntercomApi.conversationToMarkdown({
          conversation: details,
        });

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
            processed: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const contact_ids = details.contacts.contacts?.map((contact) => contact.id) || [];
        const contactBatches = chunk(contact_ids, 5);

        for (const contactBatch of contactBatches) {
          const contacts = await Promise.all(
            contactBatch.map(id => IntercomApi.getIntercomContact({ contactId: id }))
          );

          await Promise.all(contacts.map(async (contact) => {
            const endUser = await findOrCreateEndUser({ contact, appId });
            if (document && endUser) {
              await supabase.from("end_user_documents").insert({
                end_user_id: endUser.id,
                document_id: document.id,
              });
            }
          }));

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[${conversation.id}] Processing error:`, error);
      }
    }));

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function findOrCreateEndUser({
  contact,
  appId,
}: {
  contact: IntercomUser,
  appId: number,
}) {
  const supabase = await createClient();
  const { data: endUser } = await supabase
    .from("end_users")
    .select()
    .eq("email", contact.email)
    .eq("app_id", appId)
    .maybeSingle();

  if (!endUser) {
    const { data: newUser } = await supabase
      .from("end_users")
      .insert({
        email: contact.email,
        first_name: contact.name?.split(" ")[0] || "",
        last_name: contact.name?.split(" ")?.slice(1).join(" ") || "",
        app_id: appId,
        type: EndUserTypes.user,
      })
      .select()
      .single();

    return newUser;
  }

  return endUser;
}
