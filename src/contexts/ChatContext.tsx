import { createContext, useContext, useReducer, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { chatReducer } from "@/reducers/chatReducer";
import { ChatState, Message, Conversation } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { createConversation as createConversationOp, 
         loadConversations as loadConversationsOp,
         loadConversation as loadConversationOp,
         sendMessage as sendMessageOp } from "@/operations/chatOperations";

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
  const { toast } = useToast();
  const { user } = useAuth();

  const createConversation = async (model: string): Promise<Conversation> => {
    try {
      const conversation = await createConversationOp(model, user);
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
      return conversation;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const loadConversations = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const conversations = await loadConversationsOp();
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error) {
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
      const { conversation, messages } = await loadConversationOp(id);
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
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
    if (!state.currentConversation || !user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const { response, userMessage } = await sendMessageOp(
        content,
        state.currentConversation,
        user,
        state.messages
      );

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Process streaming response
      const reader = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          const chunks = decoder.decode(response.data).split('\n');
          
          let assistantMessage = '';
          for (const chunk of chunks) {
            if (chunk.startsWith('data: ')) {
              const data = chunk.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  controller.enqueue(content);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
          
          // Save assistant message
          const { error: assistantError } = await supabase
            .from('messages')
            .insert([{
              role: 'assistant',
              content: assistantMessage,
              conversation_id: state.currentConversation.id,
              user_id: null,
            }]);

          if (assistantError) throw assistantError;
          
          controller.close();
        }
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
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