import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../_lib/database.ts";
import { codeBlock } from "common-tags";
import { openai } from "../_lib/openai.ts";

export const createSummary = async (
  supabase: SupabaseClient,
  document: Tables<"documents">,
) => {
  const systemPrompt = codeBlock`
    Write a concise summary of the following text:

    ${document.content}
  `;

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
    ],
    model: "gpt-4o",
  });

  const summary = chatCompletion.choices[0].message.content;

  await supabase
    .from("documents")
    .update({
      summary: summary,
    })
    .eq("id", document.id)
    .select();

  return summary;
};
