import { createClient } from "@/utils/supabase/server";
import { IntercomConversation, IntercomUser } from "@/lib/intercom/types";
import TurndownService from "turndown";

class IntercomApi {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService();
  }

  async _getIntercomApiKey() {
    const supabase = await createClient();
    const { data: authUser } = await supabase.auth.getUser();

    if (!authUser?.user) {
      throw new Error("User not found");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("intercom_settings")
      .select("*")
      .eq("created_by", authUser.user.id)
      .single();

    if (settingsError || !settings?.api_key) {
      throw new Error("Intercom not configured or enabled for this account", {
        cause: JSON.stringify(settingsError),
      });
    }

    return settings?.api_key;
  }

  async getIntercomConversations(
    startingAfter?: string | null,
    batchSize = 100,
    createdAfter: Date = new Date("2024-01-01"),
  ): Promise<{
    conversations: IntercomConversation[];
    nextStartingAfter: string | null;
    totalCount: number;
  }> {
    const url = "https://api.intercom.io/conversations/search";
    const apiKey = await this._getIntercomApiKey();
    const searchQuery: any = {
      query: {
        operator: "AND",
        value: [],
      },
      pagination: {
        per_page: batchSize,
      },
    };

    if (startingAfter) {
      searchQuery.pagination.starting_after = startingAfter;
    }

    if (createdAfter) {
      searchQuery.query.value.push({
        field: "created_at",
        operator: ">",
        value: Math.floor(createdAfter.getTime() / 1000).toString(),
      });
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(searchQuery),
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Intercom-Version": "2.12",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      conversations: data.conversations || [],
      nextStartingAfter: data.pages?.next?.starting_after || null,
      totalCount: data.total_count || 0,
    };
  }

  async getConversationDetails(
    conversationId: string,
  ): Promise<IntercomConversation> {
    const apiKey = await this._getIntercomApiKey();
    const url = `https://api.intercom.io/conversations/${conversationId}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch conversation details: ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getIntercomContact(contactId: string): Promise<IntercomUser> {
    const apiKey = await this._getIntercomApiKey();
    const url = `https://api.intercom.io/contacts/${contactId}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch contact details: ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getIntercomTeammate(teammateId: string): Promise<IntercomUser> {
    const apiKey = await this._getIntercomApiKey();
    const url = `https://api.intercom.io/admins/${teammateId}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch teammate details: ${response.statusText}`,
      );
    }

    return response.json();
  }

  conversationToMarkdown(conversation: IntercomConversation): string {
    const messages = conversation.conversation_parts.conversation_parts;
    let markdown = `# Conversation ${conversation.id}\n\n`;
    markdown += `Created: ${
      new Date(conversation.created_at * 1000).toISOString()
    }\n\n`;

    for (const message of messages) {
      if (!message?.body) continue;

      const timestamp = new Date(message.created_at * 1000).toISOString();
      const author = `${message.author.name} (${
        message.author.type === "bot" ? "Bot" : "Unknown"
      })`;
      const bodyMarkdown = this.turndownService.turndown(message.body);

      if (bodyMarkdown) {
        markdown += `## ${author} (${timestamp})\n\n${bodyMarkdown}\n\n`;
      }
    }

    return markdown;
  }
}

export default new IntercomApi();
