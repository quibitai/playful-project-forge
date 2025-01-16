import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { ChatError } from "@/utils/errorHandling";
import { logger } from "./loggingService";

export class ChatService {
  static async createMessage(messageData: {
    role: string;
    content: string;
    conversation_id: string;
    user_id: string | null;
  }): Promise<Message> {
    try {
      logger.debug('Creating message:', messageData);
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating message:', error);
        throw new ChatError(error.message);
      }
      if (!data) {
        logger.error('No data returned when creating message');
        throw new ChatError('Failed to create message');
      }

      logger.debug('Message created successfully:', data);
      return data as Message;
    } catch (error) {
      logger.error('Error in createMessage:', error);
      throw error;
    }
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    try {
      logger.debug('Updating message:', { messageId, content });
      const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId);

      if (error) {
        logger.error('Error updating message:', error);
        throw new ChatError(error.message);
      }
      logger.debug('Message updated successfully');
    } catch (error) {
      logger.error('Error in updateMessage:', error);
      throw error;
    }
  }

  static async sendMessageToAI(messages: Message[], model: string): Promise<string> {
    try {
      logger.debug('Sending message to AI:', { messageCount: messages.length, model });
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages, model },
      });

      if (error) {
        logger.error('Error from chat function:', error);
        throw new ChatError(error.message);
      }

      if (!data?.content) {
        logger.error('No content received from chat function');
        throw new ChatError('No response content received');
      }

      logger.debug('AI response received successfully');
      return data.content;
    } catch (error) {
      logger.error('Error in sendMessageToAI:', error);
      throw error;
    }
  }
}