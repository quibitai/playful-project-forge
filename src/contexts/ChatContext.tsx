import { createContext, useContext, useReducer, ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { chatReducer } from "@/reducers/chatReducer";
import { ChatState } from "@/types/chat";
import { Message, MessageRole } from "@/types/messages";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useConversations } from "@/hooks/useConversations";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/services/loggingService";

const ChatContext = createContext<{
  state: ChatState;
  createConversation: (model: string) => Promise<any>;
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
  const { toast } = useToast();
  const { sendMessage: sendChatMessage } = useChatMessages();
  const { 
    createConversation: createNewConversation, 
    loadConversations: loadAllConversations,
    loadConversation: loadSingleConversation,
  } = useConversations();

  const createConversation = async (model: string) => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      const conversation = await createNewConversation(model, user);
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
      return conversation;
    } catch (error) {
      logger.error('Error in createConversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const loadConversations = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const conversations = await loadAllConversations();
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error) {
      logger.error('Error in loadConversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadConversation = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { conversation, messages } = await loadSingleConversation(id);
      
      const typedMessages: Message[] = messages.map(msg => ({
        ...msg,
        role: msg.role as MessageRole,
        user_id: msg.user_id ?? null
      }));
      
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_MESSAGES', payload: typedMessages });
    } catch (error) {
      logger.error('Error in loadConversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (content: string) => {
    if (!state.currentConversation || !user) {
      toast({
        title: "Error",
        description: "No active conversation or user not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Create and display user message immediately
      const userMessage: Message = {
        role: 'user',
        content,
        conversation_id: state.currentConversation.id,
        user_id: user.id,
      };

      // Create placeholder for assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        conversation_id: state.currentConversation.id,
        user_id: null,
      };

      // Add both messages to UI immediately
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      logger.debug('Sending message:', { content, conversationId: state.currentConversation.id });

      const [finalUserMessage, finalAssistantMessage] = await sendChatMessage(
        content,
        state.currentConversation.id,
        user.id,
        state.currentConversation.model,
        state.messages,
        (id, content) => {
          if (id) {
            logger.debug('Updating message content:', { id, contentLength: content.length });
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: { id, content }
            });
          }
        }
      );

      // Update messages with final versions including IDs
      if (finalUserMessage.id) {
        dispatch({ 
          type: 'UPDATE_MESSAGE', 
          payload: { id: finalUserMessage.id, content: finalUserMessage.content } 
        });
      }
      
      if (finalAssistantMessage.id) {
        dispatch({ 
          type: 'UPDATE_MESSAGE', 
          payload: { id: finalAssistantMessage.id, content: finalAssistantMessage.content } 
        });
      }

      logger.debug('Message sending complete');
    } catch (error) {
      logger.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
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