import { useState } from "react";
import { Conversation } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export function useConversations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createConversation = async (model: string, user: User | null): Promise<Conversation> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ model, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);
      const [conversationResponse, messagesResponse] = await Promise.all([
        supabase.from('conversations').select('*').eq('id', id).single(),
        supabase.from('messages').select('*').eq('conversation_id', id).order('created_at'),
      ]);

      if (conversationResponse.error) throw conversationResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      return {
        conversation: conversationResponse.data,
        messages: messagesResponse.data,
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createConversation,
    loadConversations,
    loadConversation,
    isLoading
  };
}