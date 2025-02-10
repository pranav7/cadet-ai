import { IntercomConversation } from "./types.ts";

export async function getIntercomConversations(
  apiKey: string,
  startingAfter?: string | null,
  batchSize = 50,
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
