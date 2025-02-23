import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const createSupabaseClient = (req: Request): SupabaseClient => {
  const authorization = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!authorization) {
    throw new Error("No authorization header passed");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing environment variables");
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          authorization,
        },
      },
      auth: {
        persistSession: false,
      },
      },
  );
};
