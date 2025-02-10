import { NextResponse } from "next/server";
import { IntercomService } from "@/app/services/intercom/IntercomService";
import { ConversationStorageService } from "@/app/services/intercom/ConversationStorageService";

const intercomService = new IntercomService(process.env.INTERCOM_API_TOKEN!);
const storageService = new ConversationStorageService(intercomService);

export async function POST(request: Request) {
  const payload = await request.json();

  // Verify webhook signature if needed
  // https://developers.intercom.com/building-apps/docs/webhooks#section-security

  if (payload.topic === "conversation.closed") {
    await storageService.storeConversation(payload.data.item.id);
  }

  return NextResponse.json({ success: true });
}
