import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { ChatError, handleError } from "@/utils/errorHandling";
import { logger } from "./loggingService";

/**
 * Type guard to validate message role
 */
function isValidMessageRole(role: string): role is Message['role'] {
  return ['user', 'assistant', 'system'].includes(role);
}

/**
 * Service for handling chat-related operations
 */
export class ChatService {
  /**
   * Creates a new message in the database
   */
  static async createMessage(messageData: {
    role: string;
    content: string;
    conversation_id: string;
    user_id: string | null;
  }): Promise<Message> {
    try {
      // Validate role before inserting
      if (!isValidMessageRole(messageData.role)) {
        throw new ChatError(`Invalid message role: ${messageData.role}`);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw new ChatError(error.message, error.code);
      if (!data) throw new ChatError('Failed to create message');

      // Ensure the role is properly typed in the returned message
      if (!isValidMessageRole(data.role)) {
        throw new ChatError(`Invalid role returned from database: ${data.role}`);
      }

      // Type assertion is safe here because we've validated the role
      return data as Message;
    } catch (error) {
      logger.error(error, 'createMessage');
      throw handleError(error);
    }
  }

  /**
   * Sends a chat message to the OpenAI API via Supabase Edge Function
   */
  static async sendChatMessage(
    messages: Message[],
    model: string,
    accessToken: string
  ): Promise<Response> {
    try {
      logger.debug('Sending chat message:', { model, messageCount: messages.length });
      
      const response = await supabase.functions.invoke('chat', {
        body: { messages, model },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.data) {
        throw new ChatError('No response from chat function');
      }

      return new Response(JSON.stringify(response.data));
    } catch (error) {
      logger.error(error, 'sendChatMessage');
      throw handleError(error);
    }
  }

  /**
   * Handles the streaming response from the chat function
   */
  static async handleStreamResponse(
    response: Response,
    messageId: string,
    onUpdate: (id: string, content: string) => void
  ): Promise<void> {
    try {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new ChatError('No response body available');
      }

      let accumulatedContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.debug('Stream complete');
          break;
        }

        const chunk = new TextDecoder().decode(value);
        accumulatedContent += chunk;
        
        onUpdate(messageId, accumulatedContent);
      }
    } catch (error) {
      logger.error(error, 'handleStreamResponse');
      throw handleError(error);
    }
  }
}