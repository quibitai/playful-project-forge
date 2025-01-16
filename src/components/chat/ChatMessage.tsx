import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

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
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              pre: ({ node, ...props }) => (
                <div className="relative group">
                  <pre {...props} className="rounded-lg bg-muted p-4 overflow-x-auto" />
                </div>
              ),
              code: ({ node, inline, ...props }) => (
                inline ? 
                <code {...props} className="rounded bg-muted px-1 py-0.5" /> :
                <code {...props} className="text-sm" />
              ),
              p: ({ node, ...props }) => (
                <p {...props} className="mb-4 last:mb-0" />
              ),
              ul: ({ node, ...props }) => (
                <ul {...props} className="list-disc pl-4 mb-4 last:mb-0" />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className="list-decimal pl-4 mb-4 last:mb-0" />
              ),
              li: ({ node, ...props }) => (
                <li {...props} className="mb-1 last:mb-0" />
              ),
              a: ({ node, ...props }) => (
                <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote {...props} className="border-l-4 border-muted pl-4 italic" />
              ),
              hr: ({ node, ...props }) => (
                <hr {...props} className="my-4 border-muted" />
              ),
              img: ({ node, ...props }) => (
                <img {...props} className="rounded-lg max-w-full h-auto" />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto">
                  <table {...props} className="min-w-full divide-y divide-border" />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th {...props} className="px-4 py-2 text-left font-medium" />
              ),
              td: ({ node, ...props }) => (
                <td {...props} className="px-4 py-2" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};