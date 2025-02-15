import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});
