import { createClient } from "@/utils/supabase/server";
import IntercomApi from "@/lib/intercom/api";
import { IntercomConversation, IntercomUser } from "@/lib/intercom/types";
import { Sources } from "@/constants/sources";
import { EndUserTypes } from "@/constants/end-user-types";
import { SupabaseClient } from "@supabase/supabase-js";

export default class ConversationImporter {
  private supabase?: SupabaseClient;

  constructor(
    private readonly userId: string,
    private readonly appId: number,
    private readonly createdAfter: Date = new Date("2024-01-01"),
    private readonly limit?: number,
  ) {
    this.userId = userId;
    this.appId = appId;
    this.createdAfter = createdAfter;
    this.limit = limit;
  }

  async import() {
    console.log("Starting background import ...");
    this.supabase = await createClient();
    await this._backgroundImport();
    console.log("Background import started");

    return {
      success: true,
      message: "Import started in background. Check logs for progress."
    };
  }

  private async _backgroundImport() {
    let startingAfter: string | null = null;
    let totalProcessed = 0;

    console.log("Starting background import loop ...");
    try {
      while (true) {
        const { conversations, nextStartingAfter, totalCount } =
          await IntercomApi.getIntercomConversations(
            startingAfter,
            100,
            this.createdAfter,
          );

        if (conversations.length === 0) {
          console.log("No more conversations to process");
          break;
        }

        console.log("Processing batch of", conversations.length, "conversations");
        await this._processConversationsBatch(conversations);

        totalProcessed += conversations.length;
        console.log(`Processed ${totalProcessed} of ${totalCount} conversations`);

        if (this.limit && totalProcessed >= this.limit) {
          console.log(`Reached limit of ${this.limit} conversations`);
          break;
        }

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

  private async _processConversationsBatch(
    conversations: IntercomConversation[],
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
            created_by: this.userId,
            content,
            source: Sources.Intercom,
            created_at: new Date(details.created_at * 1000).toISOString(),
            external_id: conversation.id,
            app_id: this.appId,
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
          await Promise.all(contacts.map(async (contact) => {
            const endUser = await this._findOrCreateEndUser(contact);

            if (document && this.supabase) {
              await this.supabase.from("end_user_documents").insert({
                end_user_id: endUser.id,
                document_id: document.id,
              });
            }

            console.log(`[${conversation.id}] Created new user ${contact.email}`);
          }));
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

  private async _findOrCreateEndUser(contact: IntercomUser) {
    if (!this.supabase) {
      console.error("Supabase client not initialized");
      return null;
    }

    const { data: endUser } = await this.supabase
      .from("end_users")
      .select()
      .eq("email", contact.email)
      .eq("app_id", this.appId)
      .maybeSingle();

    if (!endUser) {
      const { data: newUser } = await this.supabase
        .from("end_users")
        .insert({
          email: contact.email,
          first_name: contact.name?.split(" ")[0] || "",
          last_name: contact.name?.split(" ")?.slice(1).join(" ") || "",
          app_id: this.appId,
          type: EndUserTypes.user,
        })
        .select()
        .single();

      return newUser;
    }

    return endUser;
  }
}