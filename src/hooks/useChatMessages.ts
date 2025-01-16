import { useState } from "react";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatService } from "@/services/chatService";
import { logger } from "@/services/loggingService";
import { handleError } from "@/utils/errorHandling";

/**
 * Custom hook for managing chat messages
 */
export function useChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Sends a new message and handles the response
   */
  const sendMessage = async (
    content: string,
    conversationId: string,
    userId: string,
    model: string,
    previousMessages: Message[],
    onMessageUpdate: (id: string, content: string) => void
  ) => {
    try {
      setIsLoading(true);
      logger.debug('Sending message:', { conversationId, model });
      
      const userMessage = await ChatService.createMessage({
        role: 'user',
        content,
        conversation_id: conversationId,
        user_id: userId,
      });

      const assistantMessage = await ChatService.createMessage({
        role: 'assistant',
        content: '',
        conversation_id: conversationId,
        user_id: null,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await ChatService.sendChatMessage(
        [...previousMessages, userMessage],
        model,
        session.access_token
      );

      await ChatService.handleStreamResponse(
        response,
        assistantMessage.id,
        onMessageUpdate
      );

      return [userMessage, assistantMessage];
    } catch (error) {
      const handledError = handleError(error);
      logger.error(handledError, 'sendMessage');
      
      toast({
        title: "Error",
        description: handledError.message,
        variant: "destructive",
      });
      
      throw handledError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading
  };
}