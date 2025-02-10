export interface IntercomMessage {
  id: string;
  body: string;
  type: string;
  created_at: number;
  author: {
    name: string;
    type: string;
  };
}

export interface IntercomConversation {
  id: string;
  created_at: number;
  updated_at: number;
  title: string;
  conversation_parts: {
    conversation_parts: IntercomMessage[];
  };
}
