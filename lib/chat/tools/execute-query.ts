import { createClient } from "@/utils/supabase/server";

export default async function executeQuery({ query }: { query: string }) {
  console.log("Executing query", query);
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