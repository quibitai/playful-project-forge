import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { PostgrestError } from "@supabase/supabase-js";

export class ChatService {
  static async createMessage(messageData: {
    role: string;
    content: string;
    conversation_id: string;
    user_id: string | null;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create message');
    }

    if (!data) {
      throw new Error('No data returned from message creation');
    }

    return data as Message;
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId);

    if (error) {
      throw new Error(error.message || 'Failed to update message');
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke('chat', {
        body: { messages, model },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      if (!response.data?.content) {
        throw new Error('No content received from AI');
      }

      return response.data.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while getting AI response');
    }
  }
}