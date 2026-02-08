import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chat.store';
import { usePersonaStore } from '@/stores/persona.store';
import { useAIProviderStore } from '@/stores/ai-provider.store';
import { cn } from '@/lib/utils';
import {
  Send,
  Plus,
  Loader2,
  Copy,
  RefreshCw,
  MoreHorizontal,
  Bot,
  User,
  Sparkles,
  Code,
  FileText,
  CheckCircle,
  ChevronDown,
  Lightbulb,
  Wand2,
  Bug,
  Zap,
  BookOpen,
  Settings,
  Image,
  Paperclip,
  Mic,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { CodeBlock } from '@/components/chat/CodeBlock';
import { MessageContent } from '@/components/chat/MessageContent';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

const suggestedPrompts = [
  { icon: Code, label: 'Generate code', prompt: 'Write a TypeScript function that ', color: 'text-blue-500' },
  { icon: Bug, label: 'Debug code', prompt: 'Help me debug this code:\n```\n\n```', color: 'text-red-500' },
  { icon: Lightbulb, label: 'Explain concept', prompt: 'Explain the concept of ', color: 'text-amber-500' },
  { icon: Wand2, label: 'Refactor code', prompt: 'Refactor this code for better performance:\n```\n\n```', color: 'text-purple-500' },
  { icon: BookOpen, label: 'Write docs', prompt: 'Write documentation for ', color: 'text-green-500' },
  { icon: Zap, label: 'Optimize', prompt: 'Optimize this code:\n```\n\n```', color: 'text-orange-500' },
];

export function ChatPage() {
  const { conversationId } = useParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { currentPersona } = usePersonaStore();
  const { activeProvider, activeModel, providers, setActiveModel } = useAIProviderStore();

  const activeProviderConfig = providers.find((p) => p.id === activeProvider);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    // Simulate AI response with streaming effect
    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Simulated streaming response
    const responseContent = generateMockResponse(userMessage.content, currentPersona?.name);
    
    for (let i = 0; i < responseContent.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: responseContent.slice(0, i + 1) }
            : m
        )
      );
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
      )
    );
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const regenerateMessage = (messageId: string) => {
    toast.info('Regenerating response...');
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-secondary/20">
      {/* Header with model selector */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeProviderConfig?.icon}</span>
            <div>
              <div className="text-sm font-medium">{activeProviderConfig?.name}</div>
              <div className="text-xs text-muted-foreground">{activeModel}</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Model</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showModelSelector && "rotate-180")} />
          </button>
          
          {showModelSelector && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 border-b border-border">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">Select Model</div>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                {activeProviderConfig?.models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setActiveModel(model.id);
                      setShowModelSelector(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      activeModel === model.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.contextLength.toLocaleString()} tokens
                      </div>
                    </div>
                    {activeModel === model.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold">How can I help you today?</h2>
            <p className="mb-8 max-w-md text-center text-muted-foreground">
              {currentPersona
                ? `I'm ${currentPersona.name}. ${currentPersona.description}`
                : 'Select a persona or start chatting with the default assistant'}
            </p>
            
            {/* Suggested prompts grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => setInput(prompt.prompt)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10", prompt.color)}>
                    <prompt.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-4 animate-in fade-in slide-in-from-bottom-2',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                      : 'bg-gradient-to-br from-secondary to-secondary/50 border border-border'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div
                  className={cn(
                    'group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                      : 'bg-card border border-border'
                  )}
                >
                  <MessageContent 
                    content={message.content} 
                    isUser={message.role === 'user'}
                    isStreaming={message.isStreaming}
                  />
                  
                  {/* Message actions */}
                  {!message.isStreaming && (
                    <div
                      className={cn(
                        'absolute -bottom-8 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                        message.role === 'user' ? 'right-0' : 'left-0'
                      )}
                    >
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="flex h-7 items-center gap-1 rounded-lg bg-card border border-border px-2 text-xs shadow-sm hover:bg-accent transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => regenerateMessage(message.id)}
                          className="flex h-7 items-center gap-1 rounded-lg bg-card border border-border px-2 text-xs shadow-sm hover:bg-accent transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.isStreaming && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating response...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <button className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl hover:bg-accent transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Shift+Enter for new line)"
              rows={1}
              className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            
            <div className="flex items-center gap-1">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-accent transition-colors">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-accent transition-colors">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:scale-105 disabled:hover:scale-100"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {currentPersona && (
                <span className="flex items-center gap-1">
                  <span>{currentPersona.icon}</span>
                  <span>{currentPersona.name}</span>
                </span>
              )}
            </div>
            <span>Press Enter to send • Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock response generator
function generateMockResponse(userMessage: string, personaName?: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('typescript')) {
    return `Here's an example implementation:

\`\`\`typescript
// Example TypeScript function
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUserById(id: string): Promise<User | null> {
  try {
    const response = await fetch(\`/api/users/\${id}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return data as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// Usage example
const user = await fetchUserById('user-123');
if (user) {
  console.log(\`Found user: \${user.name}\`);
}
\`\`\`

**Key features of this implementation:**

1. **Type Safety** - Uses TypeScript interfaces for better type checking
2. **Error Handling** - Properly catches and handles errors
3. **Async/Await** - Modern async pattern for cleaner code
4. **Null Safety** - Returns null instead of throwing for not found cases

Would you like me to explain any part of this code or modify it for your specific use case?`;
  }

  if (lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
    return `Great question! Let me explain this concept for you.

## Overview

${personaName ? `As ${personaName}, I'll provide a detailed explanation tailored to your needs.` : ''}

The concept you're asking about is fundamental to modern software development. Here are the key points:

### Key Concepts

1. **First Principle** - Understanding the basics is crucial
2. **Best Practices** - Always follow industry standards
3. **Common Pitfalls** - Watch out for these mistakes

### Practical Example

\`\`\`javascript
// Here's how it works in practice
const example = {
  concept: 'explained',
  understanding: 'improved'
};
\`\`\`

### Further Reading

- Official documentation
- Community resources
- Related concepts to explore

Would you like me to dive deeper into any of these topics?`;
  }

  return `I understand you're asking about: "${userMessage}"

${personaName ? `As ${personaName}, ` : ''}I'm here to help you with this request. Here's what I can offer:

### Analysis

Your question touches on several important aspects:
- **Context** - Understanding the broader picture
- **Implementation** - Practical steps forward
- **Best Practices** - Industry-standard approaches

### Recommendations

1. Start with a clear understanding of requirements
2. Break down the problem into smaller parts
3. Implement incrementally with testing
4. Document your decisions

Would you like me to elaborate on any of these points or help you with something specific?`;
}
