import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

/**
 * Service class for handling chat-related operations
 */
export class ChatService {
  private static readonly SUPABASE_URL = 'https://eosulcourcwvrlgkaiwv.supabase.co';

  /**
   * Creates a new message in the database
   * @param messageData The message data to create
   * @returns Promise<Message>
   */
  static async createMessage(messageData: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    conversation_id: string;
    user_id?: string | null;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  }

  /**
   * Handles streaming response from the chat API
   * @param response The streaming response from the API
   * @param messageId The ID of the message to update
   * @param onUpdate Callback function to handle updates
   */
  static async handleStreamResponse(
    response: Response,
    messageId: string,
    onUpdate: (id: string, content: string) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete. Final content:', fullContent);
          break;
        }

        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('Received [DONE] signal');
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              console.log('Streaming content:', content);

              // Update the message in the database
              const { error } = await supabase
                .from('messages')
                .update({ content: fullContent })
                .eq('id', messageId);

              if (error) {
                console.error('Error updating message:', error);
                throw error;
              }

              onUpdate(messageId, fullContent);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
            console.error('Raw chunk data:', data);
          }
        }
      }
    } catch (error) {
      console.error('Error in stream processing:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Sends a chat message to the API
   * @param messages Array of messages in the conversation
   * @param model The AI model to use
   * @param accessToken The user's access token
   * @returns Promise<Response>
   */
  static async sendChatMessage(
    messages: Message[],
    model: string,
    accessToken: string
  ): Promise<Response> {
    console.log('Sending chat message:', { model, messageCount: messages.length });
    
    const response = await fetch(`${this.SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model }),
    });

    if (!response.ok) {
      console.error('Chat API error:', response.status, response.statusText);
      throw new Error('Failed to send chat message');
    }

    return response;
  }
}