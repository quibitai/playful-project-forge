import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 p-4",
        role === 'assistant' ? "bg-muted/50" : "bg-background"
      )}
    >
      <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
        <span className="text-sm">
          {role === 'user' ? '👤' : '🤖'}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm text-muted-foreground">
          {role === 'user' ? 'You' : 'Assistant'}
        </p>
        <div className="prose prose-sm max-w-none">
          <p>{content}</p>
        </div>
      </div>
    </div>
  );
};