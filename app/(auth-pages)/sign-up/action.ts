"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("first-name") as string;
  const lastName = formData.get("last-name") as string;
  const appName = formData.get("app-name") as string;
  const appSlug = appName.toLowerCase().replace(/ /g, "-");

  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  console.log("authError", authError, "authUser", authUser);
  const { data: app, error: appError } = await supabase
    .from("apps")
    .insert({
      name: appName,
      slug: appSlug,
      created_by: authUser?.user?.id,
    })
    .select()
    .single();
  console.log("appError", appError, "app", app);

  if (authError || !authUser || appError || !app) {
    return encodedRedirect(
      "error",
      "/sign-up",
      authError?.message || appError?.message || "Error signing up",
    );
  }

  return redirect("/protected");
}