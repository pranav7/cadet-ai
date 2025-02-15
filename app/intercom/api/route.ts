import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { importConversations } from "@/lib/intercom/conversation-importer";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: currentUser } = await supabase.rpc('get_current_user');
  const { data: app } = await supabase.rpc('get_current_app');

  if (!user?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const { limit } = await request.json();

  await importConversations({ userId: currentUser.id, appId: app.id, limit });

  return NextResponse.json({ success: true });
}
