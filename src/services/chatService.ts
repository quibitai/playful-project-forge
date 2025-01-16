import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { PostgrestError } from "@supabase/supabase-js";

export class ChatService {
  static async createMessage(messageData: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    conversation_id: string;
    user_id: string | null;
  }): Promise<Message> {
    console.log('Creating message:', messageData);
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      throw new Error(error instanceof PostgrestError ? error.message : 'Failed to create message');
    }

    if (!data) {
      throw new Error('No data returned from message creation');
    }

    return data as Message;
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    console.log('Updating message:', messageId, content);
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message:', error);
      throw new Error(error instanceof PostgrestError ? error.message : 'Failed to update message');
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    console.log('Sending message to AI:', { messageCount: messages.length, model });
    try {
      const response = await supabase.functions.invoke('chat', {
        body: { messages, model },
      });

      if (response.error) {
        console.error('AI response error:', response.error);
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      if (!response.data?.content) {
        throw new Error('No content received from AI');
      }

      console.log('AI response received');
      return response.data.content;
    } catch (error) {
      console.error('Error in sendMessageToAI:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while getting AI response');
    }
  }
}