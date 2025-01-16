import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

export class ChatService {
  private static readonly SUPABASE_URL = 'https://eosulcourcwvrlgkaiwv.supabase.co';

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

  static async handleStreamResponse(
    response: Response,
    messageId: string,
    onUpdate: (id: string, content: string) => void
  ): Promise<void> {
    if (!response.body) throw new Error('No response body');
    
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
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              content += delta;
              await supabase
                .from('messages')
                .update({ content })
                .eq('id', messageId);
              onUpdate(messageId, content);
            }
          } catch (e) {
            console.error('Error:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

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

    if (!response.ok) throw new Error('Failed to send chat message');
    return response;
  }
}