export interface IntercomConversation {
  id: string;
  created_at: number;
  updated_at: number;
  waiting_since: number;
  snoozed_until?: number;
  source: {
    type: string;
    id: string;
    delivered_as: string;
  };
  contacts: {
    type: string;
    id: string;
  }[];
  teammates: {
    type: string;
    id: string;
  }[];
  conversation_parts: {
    type: string;
    id: string;
    part_type: string;
    body: string;
    created_at: number;
    updated_at: number;
    notified_at: number;
    assigned_to: null | {
      id: string;
      type: string;
    };
    author: {
      id: string;
      type: string;
    };
  }[];
  // Add other fields as needed
}
