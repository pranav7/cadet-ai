import { createClient } from "@supabase/supabase-js";
import TurndownService from "turndown";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

interface IntercomMessage {
  id: string;
  body: string;
  type: string;
  created_at: number;
  author: {
    name: string;
    type: string;
  };
}

interface IntercomConversation {
  id: string;
  created_at: number;
  updated_at: number;
  title: string;
  conversation_parts: {
    conversation_parts: IntercomMessage[];
  };
}

async function getIntercomConversations(
  apiKey: string,
  startingAfter?: string | null,
): Promise<
  { conversations: IntercomConversation[]; nextStartingAfter: string | null }
> {
  const url = "https://api.intercom.io/conversations";
  const params = new URLSearchParams({
    per_page: "50",
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

async function getConversationDetails(
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

function htmlToMarkdown(html: string): string {
  try {
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      bulletListMarker: "-",
    });

    // Preserve line breaks
    turndownService.addRule("lineBreaks", {
      filter: ["br"],
      replacement: () => "\n",
    });

    return turndownService.turndown(html);
  } catch (e) {
    console.warn(
      "Failed to convert HTML to Markdown, returning raw content:",
      e,
    );
    return html;
  }
}

function conversationToMarkdown(conversation: IntercomConversation): string {
  const messages = conversation.conversation_parts.conversation_parts;
  let markdown = `# Conversation ${conversation.id}\n\n`;
  markdown += `Created: ${
    new Date(conversation.created_at * 1000).toISOString()
  }\n\n`;

  for (const message of messages) {
    const timestamp = new Date(message.created_at * 1000).toISOString();
    const author = message.author.name ||
      (message.author.type === "bot" ? "Bot" : "Unknown");
    const bodyMarkdown = htmlToMarkdown(message.body);
    markdown += `## ${author} (${timestamp})\n\n${bodyMarkdown}\n\n`;
  }

  return markdown;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({
        error: "Missing environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(
      JSON.stringify({
        error: "No authorization header",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { user_id } = await req.json();

  const { data: settings, error: settingsError } = await supabase
    .from("intercom_settings")
    .select("*")
    .single();

  console.log("settings", settings);

  if (settingsError || !settings?.api_key) {
    throw new Error("Intercom not configured or enabled for this account", {
      cause: JSON.stringify(settingsError),
    });
  }

  let totalProcessed = 0;
  let startingAfter: string | null = null;

  while (true) {
    const { conversations, nextStartingAfter } = await getIntercomConversations(
      settings.api_key,
      startingAfter,
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
          `[${conversation.id}] Found existing document for conversation, skipping`,
        );
        continue;
      }

      console.log(`[${conversation.id}] Fetching conversation details`);
      const details = await getConversationDetails(
        settings.api_key,
        conversation.id,
      );

      console.log(`[${conversation.id}] Converting conversation to markdown`);
      const content = conversationToMarkdown(details);

      console.log(`[${conversation.id}] Inserting conversation into database`);
      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          name: details.title || `Intercom conversation ${conversation.id}`,
          created_by: user_id,
          content,
          source: 1,
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

    if (!nextStartingAfter) {
      break;
    }
    startingAfter = nextStartingAfter;
  }

  return new Response(
    JSON.stringify({
      success: true,
      conversations_processed: totalProcessed,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/intercom-conversation-importer' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"user_id":"c67dadc9-77d8-4a70-9167-e88783a60385"}'

*/
