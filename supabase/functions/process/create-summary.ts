import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../_lib/database.types.ts";
import { codeBlock } from "common-tags";
import { openai } from "../_lib/openai.ts";

export const createSummary = async (
  supabase: SupabaseClient,
  document: Tables<"documents">,
) => {
  console.log(`[Create Summary] creating summary for document ${document.id}`);
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
  console.log(`[Create Summary] summary: ${summary}`);

  await supabase
    .from("documents")
    .update({
      summary: summary,
    })
    .eq("id", document.id)
    .select();

  return summary;
};
