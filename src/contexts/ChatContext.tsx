import { createContext, useContext, useReducer, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { chatReducer } from "@/reducers/chatReducer";
import { ChatState, Message, Conversation } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { 
  createConversation as createConversationOp,
  loadConversations as loadConversationsOp,
  loadConversation as loadConversationOp,
  sendMessage as sendMessageOp 
} from "@/operations/chatOperations";

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

      // Create a new message for the assistant's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        conversation_id: state.currentConversation.id,
        user_id: null,
      };

      // Insert the initial empty message
      const { data: savedMessage, error: insertError } = await supabase
        .from('messages')
        .insert([assistantMessage])
        .select()
        .single();

      if (insertError) throw insertError;

      // Add the message to the UI
      dispatch({ type: 'ADD_MESSAGE', payload: savedMessage });

      // Process streaming response
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  // Update the message in the database
                  const { error: updateError } = await supabase
                    .from('messages')
                    .update({ content: fullContent })
                    .eq('id', savedMessage.id);

                  if (updateError) throw updateError;

                  // Update the message in the UI
                  dispatch({
                    type: 'UPDATE_MESSAGE',
                    payload: { id: savedMessage.id, content: fullContent }
                  });
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing stream:', error);
        throw error;
      }

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