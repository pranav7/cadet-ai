import { createClient } from "@/utils/supabase/server";
import { codeBlock } from "common-tags";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: currentUser } = await supabase.rpc('get_current_user');
  const { data: app } = await supabase.rpc('get_current_app');

  if (!currentUser || !app) {
    return NextResponse.json(
      { error: "User or app not found" },
      { status: 401 },
    );
  }

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

    return NextResponse.json(
      {
        error: "There was an error reading your documents, please try again.",
      },
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

  return stream.toDataStreamResponse();
}
