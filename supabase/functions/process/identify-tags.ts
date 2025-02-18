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
  const { data: initialTagCheck } = await supabase
    .from("documents_tags")
    .select("*")
    .eq("document_id", document.id);

  if (initialTagCheck) {
    console.log(`[Identify Tags] Document ${document.id} already has tags`);
    return;
  }

  const appId = document.app_id;
  const { data: availableTagsData } = await supabase
    .from("tags")
    .select("*")
    .eq("app_id", appId);

  if (!availableTagsData) {
    console.error(`[Identify Tags] No available tags found for document ${document.id}`);

    return;
  }

  const availableTags = availableTagsData.map((tag) => tag.name);
  console.log(`[Identify Tags] Available tags: ${availableTags.join(", ")}`);

  const documentSummary = document.summary || '';
  const documentContent = document.content || '';

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
    If for example the document is about a customer request a feature, try your best to identify the name of the feature as a tag.

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
    ${String(documentSummary)}

    The content of the document is:
    ${String(documentContent)}
  `;

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPrompt },
    ],
    response_format: zodResponseFormat(TagResponseSchema, "tagResponse"),
  });


  const { existingTags, newTags } = response.choices[0].message.parsed;
  console.log(`[Identify Tags] OpenAI response. Existing tags: ${existingTags.join(", ")}, New tags: ${newTags.join(", ")}`);

  if (!existingTags || !newTags) {
    console.log("Failed to identify tags");
    return;
  }

  const createdTags = await createTags(supabase, appId, newTags);
  const foundTags = await findTags(supabase, appId, existingTags);

  const tagsToApply: Tables<"tags">[] = [];
  if (foundTags) tagsToApply.push(...foundTags);
  if (createdTags) tagsToApply.push(...createdTags);

  await applyTags(supabase, document, tagsToApply);
};

const createTags = async (
  supabase: SupabaseClient,
  appId: string,
  tags: string[],
): Promise<Tables<"tags">[]> => {
  const { data: tagsData } = await supabase
    .from("tags")
    .insert(
      tags.map((tag: string) => ({
        name: tag,
        slug: tag.toLowerCase().replace(/ /g, "-"),
        app_id: appId,
      })),
    )
    .select();

  return tagsData || [];
};

const findTags = async (
  supabase: SupabaseClient,
  appId: string,
  tags: string[],
): Promise<Tables<"tags">[]> => {
  const { data: tagsData } = await supabase
    .from("tags")
    .select("*")
    .eq("app_id", appId)
    .in("slug", tags.map((tag) => tag.toLowerCase().replace(/ /g, "-")));

  return tagsData || [];
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
