import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, AIResponse, MessageRole } from "@/types/messages";
import { logger } from "@/services/loggingService";
import { PostgrestError } from "@supabase/supabase-js";

export class MessageService {
  static async createMessage(messageData: MessageData): Promise<Message> {
    logger.debug('Creating message:', messageData);
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating message:', error.message);
      throw new Error(`Failed to create message: ${error.message}`);
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

  static async updateMessage(messageId: string, content: string): Promise<Message> {
    logger.debug('Updating message:', { messageId, contentLength: content.length });
    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating message:', error.message);
      throw new Error(`Failed to update message: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from message update');
    }

    return data as Message;
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    try {
      logger.debug('Sending messages to AI:', { messageCount: messages.length, model });
      
      const response = await supabase.functions.invoke<{ data: AIResponse }>('chat', {
        body: { messages, model },
      });

      if (response.error) {
        logger.error('AI function error:', typeof response.error === 'string' ? response.error : JSON.stringify(response.error));
        throw new Error('Failed to get AI response');
      }

      if (!response.data?.data?.content) {
        const errorMsg = 'Invalid response format from AI';
        logger.error(errorMsg, JSON.stringify(response));
        throw new Error(errorMsg);
      }

      logger.debug('AI response received successfully');
      return response.data.data.content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in sendMessageToAI';
      logger.error('Error in sendMessageToAI:', errorMessage);
      throw error;
    }
  }
}