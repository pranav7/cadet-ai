import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "@/supabase/functions/_lib/database.types";
import { codeBlock } from "common-tags";
import { openai } from "@/supabase/functions/_lib/openai";
import { SourceNames } from "@/supabase/functions/_lib/constants";

const model = Deno.env.get("DEFAULT_MODEL") || "gpt-4o-mini";

export const createSummary = async ({
  supabase,
  document,
  force,
}: {
  supabase: SupabaseClient;
  document: Tables<"documents">;
  force: boolean;
}) => {
  const { data: existingSummary } = await supabase
    .from("documents")
    .select("summary")
    .eq("id", document.id);

  if (existingSummary && !force) {
    console.log(`[Create Summary] Document ${document.id} already has a summary`);

    return;
  }

  const systemPrompt = codeBlock`
    Write a concise summary of the text below. Keep the language simple, and casual and avoid using complex sentences.
    Based on the source, you can understand the context of the document.

    For example, if the source is Intercom, that likely means this is a support conversation.
    If the source is Circleback, that likely means this is a sales call or a demo.

    Make sure your summary uses the context of the source, and highlights the most important parts of the document.
    For example, we're not interested in bot replies, we're more interested in the user requests.

    Source:
    ${SourceNames[document.source]}

    Content:
    ${document.content}
  `;

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
    ],
    model: model,
  });

  const summary = chatCompletion.choices[0].message.content;

  if (!summary) {
    console.error(`[Create Summary] No summary created for document ${document.id}`);

    return;
  }

  await supabase
    .from("documents")
    .update({
      summary: summary,
    })
    .eq("id", document.id)
    .select();

  return summary;
};
