import { createContext, useContext, useReducer, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  conversation_id: string;  // Changed from optional to required
  created_at?: string;
  user_id?: string;  // Added to match database schema
}

export interface Conversation {
  id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  user_id: string;  // Added to match database schema
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

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

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        currentConversation: action.payload,
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { toast } = useToast();
  const { user } = useAuth();

  const createConversation = async (model: string): Promise<Conversation> => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ model, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      const conversation = data as Conversation;
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
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      dispatch({ type: 'SET_CONVERSATIONS', payload: data });
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
      
      const [conversationResponse, messagesResponse] = await Promise.all([
        supabase.from('conversations').select('*').eq('id', id).single(),
        supabase.from('messages').select('*').eq('conversation_id', id).order('created_at'),
      ]);

      if (conversationResponse.error) throw conversationResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversationResponse.data });
      dispatch({ type: 'SET_MESSAGES', payload: messagesResponse.data });
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
      
      // Insert user message
      const userMessage: Message = {
        role: 'user',
        content,
        conversation_id: state.currentConversation.id,
        user_id: user.id,  // Added user_id
      };

      const { error: insertError } = await supabase
        .from('messages')
        .insert([userMessage]);

      if (insertError) throw insertError;

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Get AI response
      const response = await supabase.functions.invoke('chat', {
        body: { 
          messages: [...state.messages, userMessage],
          model: state.currentConversation.model,
        },
      });

      if (response.error) throw response.error;

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
              user_id: null,  // AI messages don't have a user_id
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