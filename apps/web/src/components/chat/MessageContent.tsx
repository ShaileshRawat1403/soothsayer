import { useMemo } from 'react';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  isUser?: boolean;
  isStreaming?: boolean;
}

export function MessageContent({ content, isUser, isStreaming }: MessageContentProps) {
  const parts = useMemo(() => {
    if (isUser) {
      return [{ type: 'text' as const, content }];
    }

    const result: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    
    // Split by code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        if (textContent.trim()) {
          result.push({ type: 'text', content: textContent });
        }
      }

      // Add code block
      result.push({
        type: 'code',
        content: match[2].trim(),
        language: match[1] || 'typescript',
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      if (textContent.trim()) {
        result.push({ type: 'text', content: textContent });
      }
    }

    return result.length > 0 ? result : [{ type: 'text' as const, content }];
  }, [content, isUser]);

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-secondary font-mono text-sm">$1</code>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>')
      // Line breaks (double newline = paragraph)
      .replace(/\n\n/g, '</p><p class="mb-3">')
      // Single line breaks
      .replace(/\n/g, '<br />');

    return `<p class="mb-3">${html}</p>`;
  };

  return (
    <div className={cn('prose-chat', isUser && 'text-white')}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
            />
          );
        }

        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
            className={cn(isUser ? 'text-white' : 'text-foreground')}
          />
        );
      })}
      
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
      )}
    </div>
  );
}
