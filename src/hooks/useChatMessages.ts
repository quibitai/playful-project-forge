import { useState } from "react";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatService } from "@/services/chatService";

/**
 * Custom hook for managing chat messages
 * @returns Object containing sendMessage function and loading state
 */
export function useChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Sends a new message and handles the response
   * @param content Message content
   * @param conversationId ID of the conversation
   * @param userId ID of the user
   * @param model AI model to use
   * @param previousMessages Array of previous messages
   * @param onMessageUpdate Callback to update message content
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
      
      // Create and save the user's message
      const userMessage = await ChatService.createMessage({
        role: 'user',
        content,
        conversation_id: conversationId,
        user_id: userId,
      });

      // Create a placeholder for the assistant's response
      const assistantMessage = await ChatService.createMessage({
        role: 'assistant',
        content: '',
        conversation_id: conversationId,
        user_id: null,
      });

      // Get the current session
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
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
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