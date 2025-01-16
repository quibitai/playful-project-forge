import { useState } from "react";
import { Message } from "@/types/chat";
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

      const aiResponse = await ChatService.sendMessageToAI(
        [...previousMessages, userMessage],
        model
      );

      await ChatService.updateMessage(assistantMessage.id, aiResponse);
      onMessageUpdate(assistantMessage.id, aiResponse);

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