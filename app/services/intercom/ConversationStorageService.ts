import { IntercomService } from "@/app/services/intercom/IntercomService";
import { type IntercomConversation } from "@/app/services/intercom/types";

export class ConversationStorageService {
  private readonly intercomService: IntercomService;

  constructor(intercomService: IntercomService) {
    this.intercomService = intercomService;
  }

  async storeConversation(conversationId: string) {
    const conversation = await this.intercomService.getConversation(
      conversationId,
    );

    // TODO: Implement storage logic
    // This is where you'll add the logic to store the conversation in your Documents table
    console.log("Storing conversation:", conversationId);
  }

  async backfillConversations() {
    for await (
      const conversation of this.intercomService.listAllConversations("closed")
    ) {
      await this.storeConversation(conversation.id);
    }
  }
}
