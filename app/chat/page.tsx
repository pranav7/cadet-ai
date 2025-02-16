import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import DocumentsList from "@/components/documents/list";

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-2">
      <div className="flex flex-col gap-2 items-start mt-8">
        <div className="w-[600px] mx-auto">
          <Chat />
        </div>
        <div className="w-full">
          <DocumentsList />
        </div>
      </div>
    </div>
  );
}
