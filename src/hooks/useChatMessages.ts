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
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              console.log('Streaming content:', content);

              // Update the message in the database
              const { error: updateError } = await supabase
                .from('messages')
                .update({ content: fullContent })
                .eq('id', messageId);

              if (updateError) {
                console.error('Error updating message:', updateError);
                throw updateError;
              }

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
    } finally {
      reader.releaseLock();
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

      console.log('Calling chat function with model:', model);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Call the chat function using the REST endpoint
      const response = await fetch(
        `${process.env.VITE_SUPABASE_URL || 'https://eosulcourcwvrlgkaiwv.supabase.co'}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...previousMessages, userMessage].map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            model,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get response from chat function: ${errorText}`);
      }

      await handleStreamResponse(
        response,
        savedAssistantMessage.id,
        onMessageUpdate
      );

      return [savedUserMessage, savedAssistantMessage];
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