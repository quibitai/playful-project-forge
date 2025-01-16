import { useState } from "react";
import { Message } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";
import { ChatService } from "@/services/chatService";
import { logger } from "@/services/loggingService";

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
      logger.debug('Starting message send process:', { conversationId, model });
      
      const userMessage = await ChatService.createMessage({
        role: 'user',
        content,
        conversation_id: conversationId,
        user_id: userId,
      });
      logger.debug('User message created:', userMessage);

      const assistantMessage = await ChatService.createMessage({
        role: 'assistant',
        content: '',
        conversation_id: conversationId,
        user_id: null,
      });
      logger.debug('Assistant message placeholder created:', assistantMessage);

      const aiResponse = await ChatService.sendMessageToAI(
        [...previousMessages, userMessage],
        model
      );
      logger.debug('AI response received:', aiResponse);

      await ChatService.updateMessage(assistantMessage.id, aiResponse);
      onMessageUpdate(assistantMessage.id, aiResponse);

      return [userMessage, assistantMessage];
    } catch (error) {
      logger.error('Error in sendMessage:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred while sending the message',
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading
  };
}