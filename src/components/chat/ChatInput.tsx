import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState } from "react";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
}

export const ChatInput = ({ onSubmit, isLoading }: ChatInputProps) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading) return;
    
    onSubmit(content);
    setContent("");
    textareaRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-end gap-2 p-4">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your message..."
        className="min-h-[60px] resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
};