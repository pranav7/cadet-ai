import { type IntercomConversation } from "@/app/services/intercom/types";

export class IntercomService {
  private readonly apiToken: string;
  private readonly baseUrl = "https://api.intercom.io";

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Intercom API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getConversation(conversationId: string): Promise<IntercomConversation> {
    return this.makeRequest(`/conversations/${conversationId}`);
  }

  async *listAllConversations(
    status?: "closed",
  ): AsyncGenerator<IntercomConversation> {
    let startingAfter: string | undefined;

    while (true) {
      const queryParams = new URLSearchParams();
      if (startingAfter) queryParams.set("starting_after", startingAfter);
      if (status) queryParams.set("status", status);

      const response = await this.makeRequest(`/conversations?${queryParams}`);

      for (const conversation of response.conversations) {
        yield conversation;
      }

      if (!response.pages?.next) {
        break;
      }

      startingAfter = response.pages.next.starting_after;
    }
  }
}
