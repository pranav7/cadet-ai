import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function StatusPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-2">
      <div className="flex flex-col gap-2 items-start">
        <pre className="text-xs font-mono p-3 rounded border max-h-screen overflow-auto bg-gray-100 dark:bg-gray-900">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  );
}
