import { createClient } from "@/utils/supabase/server";
import { CheckIcon, InfoIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: intercomSettings, error: intercomSettingsError } = await supabase
    .from("intercom_settings")
    .select("id")
    .eq("created_by", user.id)
    .single();

  if (intercomSettingsError) {
    console.error(intercomSettingsError);
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full flex flex-col gap-3">
        {intercomSettings && (
          <div className="bg-green-500 dark:bg-green-900 text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
            <CheckIcon size="16" strokeWidth={2} />
            Intercom is set up
          </div>
        )}
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Chat</h2>
      </div>
    </div>
  );
}
