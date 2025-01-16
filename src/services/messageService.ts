import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, AIResponse, MessageRole } from "@/types/messages";
import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/services/loggingService";

export class MessageService {
  static async createMessage(messageData: MessageData): Promise<Message> {
    logger.debug('Creating message:', messageData);
    
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating message:', error);
      throw new Error(`Failed to create message: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from message creation');
    }

    // Ensure the role is properly typed
    return {
      ...data,
      role: data.role as MessageRole,
      user_id: data.user_id
    };
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    logger.debug('Updating message:', { messageId, content });
    
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId);

    if (error) {
      logger.error('Error updating message:', error);
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    logger.debug('Sending message to AI:', { messageCount: messages.length, model });
    
    try {
      const response = await supabase.functions.invoke<{ data: AIResponse }>('chat', {
        body: { messages, model },
      });

      if (response.error) {
        logger.error('AI response error:', response.error);
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      if (!response.data?.data?.content) {
        throw new Error('No content received from AI');
      }

      logger.debug('AI response received:', response.data.data.content);
      return response.data.data.content;
    } catch (error) {
      logger.error('Error in sendMessageToAI:', error);
      throw error instanceof Error ? error : new Error('Unknown error in AI response');
    }
  }
}