import { codeBlock } from "common-tags";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { NextResponse } from "next/server";
import useCurrentSession from "@/lib/hooks/server/use-current-session";
import { z } from "zod";
import searchDocuments from "@/lib/chat/tools/search-documents";
import { createClient } from "@/utils/supabase/server";
import { databaseSchemaForLLM } from "@/constants/database-schema";

const model = process.env.CHAT_MODEL || process.env.DEFAULT_MODEL || "gpt-4o";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
});

export async function POST(req: Request) {
  const { currentUser, currentApp } = await useCurrentSession();

  if (!currentUser || !currentApp) {
    return NextResponse.json(
      { error: "User or app not found" },
      { status: 401 },
    );
  }

  const { messages } = await req.json();

  const tools = {
    search_documents: tool({
      description: "Search the database for the most relevant documents",
      parameters: z.object({
        searchQuery: z.string(),
        matchThreshold: z.number().optional(),
        createdAfterDate: z.string().optional(),
      }),
      execute: async ({ searchQuery, matchThreshold, createdAfterDate }) => {
        console.log("Executing search_documents tool", {
          searchQuery,
          matchThreshold,
          createdAfterDate: createdAfterDate ? new Date(createdAfterDate) : undefined,
        });

        const results = await searchDocuments({
          searchQuery,
          matchThreshold,
          createdAfterDate: createdAfterDate ? new Date(createdAfterDate) : undefined,
        });

        console.log("Search documents tool results", results.injectableDocuments);

        return results.injectableDocuments;
      },
    }),
    execute_sql: tool({
      description: `
        Execute a SQL query on the database.
        This will call make an RPC that will execute the query and return the results.
        Make sure to write the query in the correct syntax for the database. Use the postgres syntax.
        Don't put ; at the end of the query since it's being executed as a function.
        Make sure to properly escape ' and " in the query.

        If you encounter an error, try to fix it by yourself.
      `,
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        console.log("Executing SQL query:", query);
        return await executeQuery({ query });
      },
    }),
  };

  const systemPrompt = codeBlock`
    You run in a loop of Thought, Action, PAUSE, Observation.
    At the end of the loop you output an Answer
    Use Thought to describe your thoughts about the question you have been asked.
    Use Action to run one of the actions available to you - then return PAUSE.
    Observation will be the result of running those actions.

    You can refer to the following schema to understand the database:
    ${databaseSchemaForLLM}
  `;

  const stream = await streamText({
    model: openai(model),
    system: systemPrompt,
    messages: messages,
    tools,
    maxSteps: 5,
    onError: (error) => {
      console.error(error);
    },
  });

  return stream.toDataStreamResponse();
}

async function executeQuery({ query }: { query: string }) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('execute_sql_query', {
      sql_query: query
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return { data: null, error: error.message };
    }

    return {
      data: JSON.stringify(data) || null,
      error: null
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      data: null,
      error: "Failed to execute query"
    };
  }
}
