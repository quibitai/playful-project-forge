import { useState } from "react";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatService } from "@/services/chatService";
import { logger } from "@/services/loggingService";
import { handleError } from "@/utils/errorHandling";

export function useChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

      logger.debug('Invoking chat function...');
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [...previousMessages, userMessage],
          model,
        }
      });

      if (error) {
        logger.error('Chat function error:', error);
        throw error;
      }

      if (!data?.content) {
        throw new Error('No response content received');
      }

      logger.debug('Updating message with response:', data.content);
      await ChatService.updateMessage(assistantMessage.id, data.content);
      onMessageUpdate(assistantMessage.id, data.content);

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