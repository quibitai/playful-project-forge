import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useEffect, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";

const ChatInterface = () => {
  const { user, signOut } = useAuth();
  const { state, sendMessage, createConversation, loadConversations } = useChat();
  const [model, setModel] = useState('gpt-4o-mini');
  const { toast } = useToast();

  useEffect(() => {
    const initializeChat = async () => {
      try {
        await loadConversations();
        // Create initial conversation if none exists
        if (state.conversations.length === 0) {
          await createConversation(model);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast({
          title: "Error",
          description: "Failed to initialize chat",
          variant: "destructive",
        });
      }
    };

    if (user) {
      initializeChat();
    }
  }, [user, loadConversations, createConversation, model, state.conversations.length, toast]);

  const handleSubmit = async (content: string) => {
    try {
      // Ensure there's an active conversation
      if (!state.currentConversation) {
        const conversation = await createConversation(model);
        if (!conversation) {
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
          return;
        }
      }
      await sendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Please sign in to continue</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
          <ModelSelector value={model} onChange={setModel} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {user?.email}
          </p>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl">
          {state.messages.map((message, index) => (
            <ChatMessage
              key={message.id || index}
              id={message.id}
              role={message.role}
              content={message.content}
              reactions={message.reactions}
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

export default ChatInterface;