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
      throw new Error('Failed to update message');
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke<{ data: AIResponse }>('chat', {
        body: { messages, model },
      });

      if (response.error) {
        throw new Error('Failed to get AI response');
      }

      if (!response.data?.data?.content) {
        throw new Error('No content received from AI');
      }

      return response.data.data.content;
    } catch (error) {
      throw new Error('Failed to process AI response');
    }
  }
}