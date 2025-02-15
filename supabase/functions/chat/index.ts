import { createClient } from "@supabase/supabase-js";
import { codeBlock } from "common-tags";
import { createOpenAI } from "ai-sdk-openai";
import { streamText } from "ai";
import { corsHeaders } from "../_lib/cors.ts";

const openai = createOpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
  compatibility: "strict",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({
        error: "Missing environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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

  const { messages, embedding } = await req.json();

  const { data: documents, error: matchError } = await supabase
    .rpc("match_document_sections", {
      embedding,
      match_threshold: 0.8,
    })
    .select("content")
    .limit(10);

  if (matchError) {
    console.log("matchError", matchError);

    return new Response(
      JSON.stringify({
        error: "There was an error reading your documents, please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  console.log("documents", documents.map(({ content }) => content));

  const injectedDocs = documents && documents.length > 0
    ? documents.map(({ content }) => content).join("\n\n")
    : "No documents found";

  const systemPrompt = codeBlock`
    You're an AI assistant who answers questions about documents.
    You're a chat bot, so keep your replies succinct.

    You're only allowed to use the documents below to answer the question.

    If the question isn't related to these documents, say:
    "Sorry, I couldn't find any information on that."

    If the information isn't available in the below documents, say:
    "Sorry, I couldn't find any information on that."

    Do not go off topic.

    Documents:
    ${injectedDocs}
  `;

  const stream = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: messages,
  });

  const streamResponse = await stream.toDataStreamResponse();
  return new Response(streamResponse.body, {
    headers: {
      ...corsHeaders,
      ...streamResponse.headers,
    },
  });
});
