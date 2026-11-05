declare namespace Api {
  type AssistantActionType = 'OPEN_SEARCH' | 'OPEN_BOOKING' | 'OPEN_TICKET' | 'OPEN_SUPPORT_NEW' | 'OPEN_FAQ';

  /**
   * A button the assistant proposes. The assistant performs nothing: the app opens the matching
   * screen and the customer confirms there. Only the fields of the `type` are set.
   */
  interface AssistantAction {
    type: AssistantActionType;
    bookingId?: string | null;
    from?: string | null;
    to?: string | null;
    /** YYYY-MM-DD */
    date?: string | null;
    returnDate?: string | null;
    adults?: number | null;
    children?: number | null;
    infants?: number | null;
    subject?: string | null;
    content?: string | null;
  }

  interface AssistantTurn {
    role: 'user' | 'assistant';
    text: string;
  }

  interface AssistantReply {
    reply: string;
    suggestions: string[];
    actions: AssistantAction[];
  }
}
