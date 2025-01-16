import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gpt-4o-mini');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = async (content: string) => {
    try {
      setIsLoading(true);
      const newMessage: Message = { role: 'user', content };
      setMessages(prev => [...prev, newMessage]);

      const response = await supabase.functions.invoke('chat', {
        body: { messages: [...messages, newMessage], model },
      });

      if (response.error) throw response.error;

      const reader = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          const chunks = decoder.decode(response.data).split('\n');
          
          let assistantMessage = '';
          for (const chunk of chunks) {
            if (chunk.startsWith('data: ')) {
              const data = chunk.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  controller.enqueue(content);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
          
          setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
          controller.close();
        }
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
          <ModelSelector value={model} onChange={setModel} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {user ? `Signed in as ${user.email}` : 'Loading...'}
          </p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
            />
          ))}
        </div>
      </main>

      <footer className="border-t">
        <div className="container mx-auto max-w-4xl">
          <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default Index;