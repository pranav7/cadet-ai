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

export interface IntercomUser {
  id: string;
  name: string;
  email: string;
  type: "contact" | "teammate";
}

export interface IntercomConversation {
  id: string;
  created_at: number;
  updated_at: number;
  title: string;
  conversation_parts: {
    conversation_parts: IntercomMessage[];
  };
  contacts: {
    contacts: IntercomUser[];
  };
  teammates: {
    teammates: IntercomUser[];
  };
}

export interface IntercomPagination {
  pages: {
    next?: {
      starting_after: string;
    };
  };
  conversations: IntercomConversation[];
}
