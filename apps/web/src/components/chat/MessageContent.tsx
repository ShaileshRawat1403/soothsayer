import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MessageContentProps {
  content: string;
  isUser?: boolean;
  isStreaming?: boolean;
}

export function MessageContent({ content, isUser, isStreaming }: MessageContentProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className={cn('prose-chat', isUser && 'text-white')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-sm" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                code={String(children).replace(/\n$/, '')}
                language={match?.[1] || 'text'}
              />
            );
          },
          a({ href, children }: { href?: string; children?: ReactNode }) {
            return (
              <a
                href={href}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          h1({ children }: { children?: ReactNode }) {
            return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
          },
          h2({ children }: { children?: ReactNode }) {
            return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>;
          },
          h3({ children }: { children?: ReactNode }) {
            return <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>;
          },
          ul({ children }: { children?: ReactNode }) {
            return <ul className="ml-4 list-disc mb-3">{children}</ul>;
          },
          ol({ children }: { children?: ReactNode }) {
            return <ol className="ml-4 list-decimal mb-3">{children}</ol>;
          },
          li({ children }: { children?: ReactNode }) {
            return <li className="mb-1">{children}</li>;
          },
          p({ children }: { children?: ReactNode }) {
            return <p className="mb-3">{children}</p>;
          },
          strong({ children }: { children?: ReactNode }) {
            return <strong className="font-semibold">{children}</strong>;
          },
          em({ children }: { children?: ReactNode }) {
            return <em className="italic">{children}</em>;
          },
          blockquote({ children }: { children?: ReactNode }) {
            return (
              <blockquote className="border-l-4 border-border pl-4 italic my-3 text-secondary-content">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
    </div>
  );
}
