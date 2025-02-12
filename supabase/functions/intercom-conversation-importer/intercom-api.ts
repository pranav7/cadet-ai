import { SupabaseClient } from '@supabase/supabase-js';
import { IntercomConversation } from "./types.ts";
import { htmlToMarkdown } from "./markdown-converter.ts";

async function getIntercomApiKey(supabase: SupabaseClient) {
  const { data: settings, error: settingsError } = await supabase
    .from("intercom_settings")
    .select("*")
    .single();

  if (settingsError || !settings?.api_key) {
    throw new Error("Intercom not configured or enabled for this account", {
      cause: JSON.stringify(settingsError),
    });
  }

  return settings?.api_key;
}

export async function getIntercomConversations(
  supabase: SupabaseClient,
  startingAfter?: string | null,
  batchSize = 100,
  createdAfter?: Date,
): Promise<{
  conversations: IntercomConversation[];
  nextStartingAfter: string | null;
  totalCount: number;
}> {
  const url = "https://api.intercom.io/conversations/search";
  const apiKey = await getIntercomApiKey(supabase);
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

export async function getConversationDetails(
  conversationId: string,
  supabase: SupabaseClient,
): Promise<IntercomConversation> {
  const apiKey = await getIntercomApiKey(supabase);
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

export function conversationToMarkdown(
  conversation: IntercomConversation,
): string {
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
    const bodyMarkdown = htmlToMarkdown(message.body);

    if (bodyMarkdown) {
      markdown += `## ${author} (${timestamp})\n\n${bodyMarkdown}\n\n`;
    }
  }

  return markdown;
}
