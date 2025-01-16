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
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw new ChatError(error.message);
      if (!data) throw new ChatError('Failed to create message');

      return data as Message;
    } catch (error) {
      logger.error(error, 'createMessage');
      throw error;
    }
  }

  static async updateMessage(messageId: string, content: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId);

      if (error) throw new ChatError(error.message);
    } catch (error) {
      logger.error(error, 'updateMessage');
      throw error;
    }
  }
}