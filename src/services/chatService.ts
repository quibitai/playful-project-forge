import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

/**
 * Service class for handling chat-related operations
 * Manages message creation, updates, and OpenAI interactions
 */
export class ChatService {
  private static readonly SUPABASE_URL = 'https://eosulcourcwvrlgkaiwv.supabase.co';

  /**
   * Creates a new message in the database
   * @param messageData Message data to be created
   * @returns Created message
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

    if (error) {
      console.error('Error creating message:', error);
      throw error;
    }
    return data as Message;
  }

  /**
   * Handles the streaming response from OpenAI
   * @param response Response from the chat edge function
   * @param messageId ID of the message to update
   * @param onUpdate Callback function to update UI with new content
   */
  static async handleStreamResponse(
    response: Response,
    messageId: string,
    onUpdate: (id: string, content: string) => void
  ): Promise<void> {
    if (!response.body) {
      throw new Error('No response body');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              content += data.content;
              // Update the message content in the database
              const { error } = await supabase
                .from('messages')
                .update({ content })
                .eq('id', messageId);

              if (error) {
                console.error('Error updating message:', error);
                throw error;
              }

              // Update the UI
              onUpdate(messageId, content);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Sends a chat message to the OpenAI API via edge function
   * @param messages Array of previous messages
   * @param model OpenAI model to use
   * @param accessToken Supabase access token
   * @returns Response from the edge function
   */
  static async sendChatMessage(
    messages: Message[],
    model: string,
    accessToken: string
  ): Promise<Response> {
    const response = await fetch(`${this.SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Chat function error:', error);
      throw new Error('Failed to send chat message');
    }

    return response;
  }
}