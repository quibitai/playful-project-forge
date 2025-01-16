import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, AIResponse, MessageRole } from "@/types/messages";

export class MessageService {
  static async createMessage(messageData: MessageData): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }

    if (!data) {
      throw new Error('No data returned from message creation');
    }

    return {
      ...data,
      role: data.role as MessageRole,
      user_id: data.user_id
    };
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    try {
      console.log('Sending messages to AI:', { messageCount: messages.length, model });
      
      const response = await supabase.functions.invoke<{ data: AIResponse }>('chat', {
        body: { messages, model },
      });

      if (response.error) {
        console.error('AI function error:', response.error);
        throw new Error('Failed to get AI response');
      }

      if (!response.data?.data?.content) {
        console.error('Invalid AI response format:', response);
        throw new Error('Invalid response format from AI');
      }

      console.log('AI response received successfully');
      return response.data.data.content;
    } catch (error) {
      console.error('Error in sendMessageToAI:', error);
      throw error;
    }
  }
}