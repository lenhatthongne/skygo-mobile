declare namespace Api {
  interface Faq {
    id: number;
    category: string;
    question: string;
    answer: string;
    sortOrder: number;
  }

  type SupportStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

  interface SupportRequest {
    id: number;
    subject: string;
    content: string;
    status: SupportStatus;
    /** Null until SkyGo replies. */
    adminReply: string | null;
    createdAt: string;
    updatedAt: string;
    /** Newest message of the conversation (a photo is "[Ảnh]"). */
    lastMessage: string | null;
    lastSender: SupportSender | null;
    lastMessageAt: string | null;
    /** Messages from SkyGo the customer has not opened yet. */
    unread: number;
  }

  type SupportSender = 'CUSTOMER' | 'ADMIN';

  interface SupportMessage {
    id: number;
    sender: SupportSender;
    body: string | null;
    /** Path under the API base URL, fetched with the same Bearer token. */
    imageUrl: string | null;
    createdAt: string;
  }

  interface SupportThread {
    request: SupportRequest;
    messages: SupportMessage[];
  }

  interface SupportRequestInput {
    /** 1–150 characters */
    subject: string;
    /** 1–5000 characters */
    content: string;
  }
}
