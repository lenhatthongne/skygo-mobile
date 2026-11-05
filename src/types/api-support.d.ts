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
  }

  interface SupportRequestInput {
    /** 1–150 characters */
    subject: string;
    /** 1–5000 characters */
    content: string;
  }
}
