/**
 * Represents a chat message in the system
 * @interface Message
 */
export interface Message {
  /** Unique identifier for the message */
  id?: string;
  /** Role of the message sender (user, assistant, or system) */
  role: 'user' | 'assistant' | 'system';
  /** Content of the message */
  content: string;
  /** ID of the conversation this message belongs to */
  conversation_id: string;
  /** Optional timestamp when the message was created */
  created_at?: string;
  /** ID of the user who sent the message (null for assistant messages) */
  user_id?: string | null;
  /** Optional array of reactions to this message */
  reactions?: MessageReaction[];
}

/**
 * Represents a reaction to a message
 * @interface MessageReaction
 */
export interface MessageReaction {
  /** Unique identifier for the reaction */
  id: string;
  /** ID of the message this reaction belongs to */
  message_id: string;
  /** ID of the user who created the reaction */
  user_id: string;
  /** Type of reaction */
  reaction: string;
  /** Timestamp when the reaction was created */
  created_at: string;
}

/**
 * Represents a conversation in the chat system
 * @interface Conversation
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;
  /** Optional title of the conversation */
  title: string | null;
  /** The AI model used for this conversation */
  model: string;
  /** Timestamp when the conversation was created */
  created_at: string;
  /** Timestamp when the conversation was last updated */
  updated_at: string;
  /** ID of the user who owns this conversation */
  user_id: string;
}

/**
 * Represents the global chat state
 * @interface ChatState
 */
export interface ChatState {
  /** Array of all conversations */
  conversations: Conversation[];
  /** Currently active conversation */
  currentConversation: Conversation | null;
  /** Messages in the current conversation */
  messages: Message[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Union type for all possible chat actions
 * @type ChatAction
 */
export type ChatAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };