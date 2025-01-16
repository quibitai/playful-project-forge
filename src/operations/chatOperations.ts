import { supabase } from "@/integrations/supabase/client";
import { Message, Conversation } from "@/types/chat";
import { User } from "@supabase/supabase-js";

export async function createConversation(model: string, user: User | null) {
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('conversations')
    .insert([{ model, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

export async function loadConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
}

export async function loadConversation(id: string) {
  const [conversationResponse, messagesResponse] = await Promise.all([
    supabase.from('conversations').select('*').eq('id', id).single(),
    supabase.from('messages').select('*').eq('conversation_id', id).order('created_at'),
  ]);

  if (conversationResponse.error) throw conversationResponse.error;
  if (messagesResponse.error) throw messagesResponse.error;

  return {
    conversation: conversationResponse.data as Conversation,
    messages: messagesResponse.data as Message[],
  };
}

export async function sendMessage(content: string, conversation: Conversation, user: User | null, messages: Message[]) {
  if (!user) throw new Error('User not authenticated');

  const userMessage: Message = {
    role: 'user',
    content,
    conversation_id: conversation.id,
    user_id: user.id,
  };

  const { error: insertError } = await supabase
    .from('messages')
    .insert([userMessage]);

  if (insertError) throw insertError;

  const response = await supabase.functions.invoke('chat', {
    body: { 
      messages: [...messages, userMessage],
      model: conversation.model,
    },
  });

  if (response.error) throw response.error;

  return { response, userMessage };
}