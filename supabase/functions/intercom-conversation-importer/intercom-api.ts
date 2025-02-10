import { IntercomConversation } from "./types.ts";
import { htmlToMarkdown } from "../_lib/markdown-converter.ts";

export async function getIntercomConversations(
  apiKey: string,
  startingAfter?: string | null,
  batchSize = 50,
  createdAfter?: Date,
): Promise<
  { conversations: IntercomConversation[]; nextStartingAfter: string | null }
> {
  const url = "https://api.intercom.io/conversations";
  const params = new URLSearchParams({
    per_page: batchSize.toString(),
  });
  if (startingAfter) {
    params.append("starting_after", startingAfter);
  }
  if (createdAfter) {
    params.append(
      "created_after",
      Math.floor(createdAfter.getTime() / 1000).toString(),
    );
  }

  const response = await fetch(`${url}?${params}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  const data = await response.json();
  const nextStartingAfter = data.pages?.next?.starting_after || null;

  return {
    conversations: data.conversations,
    nextStartingAfter,
  };
}

export async function getConversationDetails(
  apiKey: string,
  conversationId: string,
): Promise<IntercomConversation> {
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
