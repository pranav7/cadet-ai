import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import ConversationImporter from "@/lib/intercom/conversation-importer";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: currentUser } = await supabase.rpc('get_current_user');
  const { data: app } = await supabase.rpc('get_current_app');

  if (!user?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const { limit } = await request.json();
  const importer = new ConversationImporter(currentUser.id, app.id, undefined, limit);
  await importer.import();

  return NextResponse.json({ success: true });
}
