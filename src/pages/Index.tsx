import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useEffect, useState } from "react";
import { ChatProvider, useChat } from "@/contexts/ChatContext";

const ChatInterface = () => {
  const { user } = useAuth();
  const { state, sendMessage, createConversation, loadConversations } = useChat();
  const [model, setModel] = useState('gpt-4o-mini');

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = async (content: string) => {
    if (!state.currentConversation) {
      const conversation = await createConversation(model);
      if (!conversation) return;
    }
    await sendMessage(content);
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
          {state.messages.map((message, index) => (
            <ChatMessage
              key={message.id || index}
              role={message.role}
              content={message.content}
            />
          ))}
        </div>
      </main>

      <footer className="border-t">
        <div className="container mx-auto max-w-4xl">
          <ChatInput onSubmit={handleSubmit} isLoading={state.isLoading} />
        </div>
      </footer>
    </div>
  );
};

const Index = () => (
  <ChatProvider>
    <ChatInterface />
  </ChatProvider>
);

export default Index;