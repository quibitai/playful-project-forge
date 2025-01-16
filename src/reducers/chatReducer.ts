import { ChatState, ChatAction } from '@/types/chat';

/**
 * Reducer function for managing chat state
 * @param state Current chat state
 * @param action Action to perform on the state
 * @returns Updated chat state
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      // Update the list of conversations
      return { ...state, conversations: action.payload };
      
    case 'SET_CURRENT_CONVERSATION':
      // Set the active conversation
      return { ...state, currentConversation: action.payload };
      
    case 'ADD_CONVERSATION':
      // Add a new conversation and set it as active
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        currentConversation: action.payload,
      };
      
    case 'SET_MESSAGES':
      // Update the messages array
      return { ...state, messages: action.payload };
      
    case 'ADD_MESSAGE':
      // Append a new message to the messages array
      return { ...state, messages: [...state.messages, action.payload] };
      
    case 'UPDATE_MESSAGE':
      // Update the content of a specific message
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.payload.id
            ? { ...message, content: action.payload.content }
            : message
        ),
      };
      
    case 'SET_LOADING':
      // Update the loading state
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      // Update the error state
      return { ...state, error: action.payload };
      
    default:
      return state;
  }
}