export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id?: string;
  role: MessageRole;
  content: string;
  conversation_id: string;
  user_id: string | null;
  created_at?: string;
  reactions?: any[];
}

export interface MessageData {
  role: MessageRole;
  content: string;
  conversation_id: string;
  user_id: string | null;
}

export interface AIResponse {
  content: string;
}