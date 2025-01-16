export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageData {
  role: MessageRole;
  content: string;
  conversation_id: string;
  user_id: string | null;
}

export interface Message extends MessageData {
  id?: string;
  created_at?: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface AIResponse {
  content: string;
}