import { openai } from "../_lib/openai.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../_lib/database.types.ts";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const TagResponseSchema = z.object({
  existingTags: z.array(z.string()),
  newTags: z.array(z.string()),
});

export const identifyTags = async (
  supabase: SupabaseClient,
  document: Tables<"documents">,
) => {
  const appId = document.app_id;
  const { data: availableTagsData, error: availableTagsError } = await supabase
    .from("tags")
    .select("*")
    .eq("app_id", appId);

  if (availableTagsError) {
    console.error(availableTagsError);
    return;
  }

  const availableTags = availableTagsData.map((tag) => tag.name);

  const systemPrompt = codeBlock`
    You are a helpful assistant that identifies the most relevant tags for a given document.
    You will be given a quick summary of the document and the content of the document.
    Your goal is to identify the most relevant tags for the document from the following list of tags:

    Existing tags available:
    ${availableTags.join(", ")}

    If there are no relevant tags in the existing tags list above, or if the existing tags list is empty,
    you should try your best to identify the most relevant tags for the document yourself. You can use
    the below examples to either identify the tags or suggest new tags that you feel are missing,
    and they best describe what the document is about.

    The existing tags are what you would have suggested for other similar documents in the past.

    Some examples of tags are:
    - "Feature request"
    - "Bug report"
    - "Confusion"
    - "Existing feature"
    - "New feature"
    - "Question"
    - "Issue"
    - "Improvement"
    - "Help wanted"
    - "Happy"
    - "Sad"
    - "Frustrated"

    If you are identifying existing tags, return the tags in the "existingTags" array.
    If you are suggesting new tags, return the new tags in the "newTags" array.

    A quick summary of the document is:
    ${document.summary}

    The content of the document is:
    ${document.content}
  `;

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPrompt },
    ],
    response_format: zodResponseFormat(TagResponseSchema, "tagResponse"),
  });

  const { existingTags, newTags } = response.choices[0].message.parsed;

  if (!existingTags || !newTags) {
    console.log("Failed to identify tags");
    return;
  }

  const newTagsData = await createTags(supabase, appId, newTags);
  const existingTagsData = await findTags(supabase, appId, existingTags);
  const tagsToApply: Tables<"tags">[] = [];
  if (existingTagsData) tagsToApply.push(...existingTagsData);
  if (newTagsData) tagsToApply.push(...newTagsData);

  await applyTags(supabase, document, tagsToApply);
};

const createTags = async (
  supabase: SupabaseClient,
  appId: string,
  tags: string[],
) => {
  const { data: tagsData } = await supabase
    .from("tags")
    .insert(
      tags.map((tag: string) => ({
        name: tag,
        slug: tag.toLowerCase().replace(/ /g, "-"),
        app_id: appId,
      })),
    );

  return tagsData;
};

const findTags = async (
  supabase: SupabaseClient,
  appId: string,
  tags: string[],
) => {
  const { data: tagsData } = await supabase
    .from("tags")
    .select("*")
    .eq("app_id", appId)
    .in("slug", tags.map((tag) => tag.toLowerCase().replace(/ /g, "-")));

  return tagsData;
};

const applyTags = async (
  supabase: SupabaseClient,
  document: Tables<"documents">,
  tags: Tables<"tags">[] | [],
) => {
  if (tags.length === 0) return;

  await supabase
    .from("documents_tags")
    .insert(
      tags.map((tag) => ({
        document_id: document.id,
        tag_id: tag.id,
      })),
    );
};
