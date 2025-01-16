import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ComponentPropsWithoutRef } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Define proper types for the markdown components
type MarkdownComponentProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
} & ComponentPropsWithoutRef<any>;

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
              pre: ({ node, ...props }: MarkdownComponentProps) => (
                <div className="relative group">
                  <pre {...props} className="rounded-lg bg-muted p-4 overflow-x-auto" />
                </div>
              ),
              code: ({ inline, className, children, ...props }: MarkdownComponentProps) => {
                const match = /language-(\w+)/.exec(className || '');
                return inline ? (
                  <code {...props} className="rounded bg-muted px-1 py-0.5">
                    {children}
                  </code>
                ) : (
                  <code
                    {...props}
                    className={cn(
                      "text-sm block",
                      match ? `language-${match[1]}` : ''
                    )}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ node, ...props }: MarkdownComponentProps) => (
                <p {...props} className="mb-4 last:mb-0" />
              ),
              ul: ({ node, ...props }: MarkdownComponentProps) => (
                <ul {...props} className="list-disc pl-4 mb-4 last:mb-0" />
              ),
              ol: ({ node, ...props }: MarkdownComponentProps) => (
                <ol {...props} className="list-decimal pl-4 mb-4 last:mb-0" />
              ),
              li: ({ node, ...props }: MarkdownComponentProps) => (
                <li {...props} className="mb-1 last:mb-0" />
              ),
              a: ({ node, ...props }: MarkdownComponentProps) => (
                <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
              ),
              blockquote: ({ node, ...props }: MarkdownComponentProps) => (
                <blockquote {...props} className="border-l-4 border-muted pl-4 italic" />
              ),
              hr: ({ node, ...props }: MarkdownComponentProps) => (
                <hr {...props} className="my-4 border-muted" />
              ),
              img: ({ node, ...props }: MarkdownComponentProps) => (
                <img {...props} className="rounded-lg max-w-full h-auto" />
              ),
              table: ({ node, ...props }: MarkdownComponentProps) => (
                <div className="overflow-x-auto">
                  <table {...props} className="min-w-full divide-y divide-border" />
                </div>
              ),
              th: ({ node, ...props }: MarkdownComponentProps) => (
                <th {...props} className="px-4 py-2 text-left font-medium" />
              ),
              td: ({ node, ...props }: MarkdownComponentProps) => (
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