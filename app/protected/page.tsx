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

  return (
    <div className="flex-1 w-[600px] flex flex-col gap-2">
      <div className="flex flex-col gap-2 items-start mt-8">
        <Chat />
      </div>
    </div>
  );
}
