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
      
      // Create and save the user's message
      const userMessage: Message = {
        role: 'user',
        content,
        conversation_id: state.currentConversation.id,
        user_id: user.id,
      };

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert([userMessage])
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { ...savedUserMessage, role: 'user' as const } 
      });

      // Create a new message for the assistant's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        conversation_id: state.currentConversation.id,
        user_id: null,
      };

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('messages')
        .insert([assistantMessage])
        .select()
        .single();

      if (assistantMessageError) throw assistantMessageError;

      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { ...savedAssistantMessage, role: 'assistant' as const } 
      });

      // Call the chat function with streaming response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...state.messages, userMessage].map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            model: state.currentConversation.model,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response from chat function');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;

                // Update the message in the database
                const { error: updateError } = await supabase
                  .from('messages')
                  .update({ content: fullContent })
                  .eq('id', savedAssistantMessage.id);

                if (updateError) throw updateError;

                // Update the message in the UI
                dispatch({
                  type: 'UPDATE_MESSAGE',
                  payload: { id: savedAssistantMessage.id, content: fullContent }
                });
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error processing stream:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error in sendMessage:', error);
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