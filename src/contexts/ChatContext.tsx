import { createContext, useContext, useReducer, ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { chatReducer } from "@/reducers/chatReducer";
import { ChatState, Message, Conversation } from "@/types/chat";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useConversations } from "@/hooks/useConversations";

const ChatContext = createContext<{
  state: ChatState;
  createConversation: (model: string) => Promise<Conversation>;
  sendMessage: (content: string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
} | null>(null);

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();
  const { sendMessage: sendChatMessage, isLoading: isSending } = useChatMessages();
  const { 
    createConversation: createNewConversation, 
    loadConversations: loadAllConversations,
    loadConversation: loadSingleConversation,
    isLoading: isLoadingConversations 
  } = useConversations();

  const createConversation = async (model: string): Promise<Conversation> => {
    const conversation = await createNewConversation(model, user);
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    return conversation;
  };

  const loadConversations = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const conversations = await loadAllConversations();
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadConversation = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { conversation, messages } = await loadSingleConversation(id);
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (content: string) => {
    if (!state.currentConversation || !user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const [userMessage, assistantMessage] = await sendChatMessage(
        content,
        state.currentConversation.id,
        user.id,
        state.currentConversation.model,
        state.messages,
        (id, content) => dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { id, content }
        })
      );

      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { ...userMessage, role: 'user' as const } 
      });

      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { ...assistantMessage, role: 'assistant' as const } 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <ChatContext.Provider value={{
      state,
      createConversation,
      sendMessage,
      loadConversation,
      loadConversations,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}