import { IntercomService } from "@/app/services/intercom/IntercomService";
import { ConversationStorageService } from "@/app/services/intercom/ConversationStorageService";

async function main() {
  const intercomService = new IntercomService(
    process.env.INTERCOM_ACCESS_TOKEN!,
  );
  const storageService = new ConversationStorageService(intercomService);

  console.log("Starting backfill of Intercom conversations...");
  await storageService.backfillConversations();
  console.log("Backfill complete!");
}

main().catch(console.error);
