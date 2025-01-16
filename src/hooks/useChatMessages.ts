import { useState } from "react";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStreamResponse = async (
    response: Response,
    messageId: string,
    onUpdate: (id: string, content: string) => void
  ) => {
    let fullContent = '';
    const decoder = new TextDecoder();

    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;

              // Update the message in the database
              const { error: updateError } = await supabase
                .from('messages')
                .update({ content: fullContent })
                .eq('id', messageId);

              if (updateError) throw updateError;

              // Update the message in the UI
              onUpdate(messageId, fullContent);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  };

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
      const userMessage: Message = {
        role: 'user',
        content,
        conversation_id: conversationId,
        user_id: userId,
      };

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert([userMessage])
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Create a new message for the assistant's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        conversation_id: conversationId,
        user_id: null,
      };

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('messages')
        .insert([assistantMessage])
        .select()
        .single();

      if (assistantMessageError) throw assistantMessageError;

      // Call the chat function with streaming response
      const response = await supabase.functions.invoke('chat', {
        body: { 
          messages: [...previousMessages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model,
        },
        headers: {
          'Accept': 'text/event-stream',
        }
      });

      if (response.error) throw response.error;
      if (!response.data) throw new Error('No response from chat function');

      await handleStreamResponse(
        response.data,
        savedAssistantMessage.id,
        onMessageUpdate
      );

      return [savedUserMessage, savedAssistantMessage];
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
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