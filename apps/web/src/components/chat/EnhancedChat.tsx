import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  Image,
  MoreVertical,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Code2,
  ChevronDown,
  Sparkles,
  Bot,
  User,
  Clock,
  Zap,
  Settings,
  AlertCircle,
  Check,
  X,
  Play,
  Square,
  FileCode,
  Terminal,
} from 'lucide-react';
import { useChatStore, Message } from '../../stores/chat.store';
import { useAIProviderStore } from '../../stores/ai-provider.store';
import { usePersonaStore } from '../../stores/persona.store';
import { CodeExplainer } from '../code/CodeExplainer';
import { toast } from '../common/Toast';

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex items-center gap-1">
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      className="w-2 h-2 bg-blue-400 rounded-full"
    />
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      className="w-2 h-2 bg-blue-400 rounded-full"
    />
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      className="w-2 h-2 bg-blue-400 rounded-full"
    />
  </div>
);

// Message action menu
const MessageActions: React.FC<{
  message: Message;
  onCopy: () => void;
  onRegenerate: () => void;
  onReact: (reaction: 'like' | 'dislike') => void;
}> = ({ message, onCopy, onRegenerate, onReact }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={onCopy}
        className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors"
        title="Copy message"
      >
        <Copy className="w-4 h-4" />
      </button>
      
      {message.role === 'assistant' && (
        <>
          <button
            onClick={onRegenerate}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReact('like')}
            className={`p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors ${
              message.reaction === 'like' ? 'text-green-400' : 'text-gray-400 hover:text-white'
            }`}
            title="Good response"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReact('dislike')}
            className={`p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors ${
              message.reaction === 'dislike' ? 'text-red-400' : 'text-gray-400 hover:text-white'
            }`}
            title="Bad response"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </>
      )}
      
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden"
            >
              <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Save
              </button>
              <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2">
                <Code2 className="w-4 h-4" /> View raw
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Code block detection and rendering
const renderMessageContent = (content: string, onExecuteCode?: (code: string, lang: string) => void) => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Add code block with explainer
    const language = match[1] || 'plaintext';
    const code = match[2].trim();
    parts.push(
      <div key={match.index} className="my-4">
        <CodeExplainer
          code={code}
          language={language}
          title={`${language} code`}
          enableAIExplanations={true}
          onExecute={onExecuteCode ? () => onExecuteCode(code, language) : undefined}
          onCopy={() => {
            navigator.clipboard.writeText(code);
            toast.success('Code copied to clipboard');
          }}
        />
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
};

// Single message component
const ChatMessage: React.FC<{
  message: Message;
  personaName?: string;
  personaAvatar?: string;
  onCopy: () => void;
  onRegenerate: () => void;
  onReact: (reaction: 'like' | 'dislike') => void;
  onExecuteCode?: (code: string, lang: string) => void;
}> = ({ message, personaName, personaAvatar, onCopy, onRegenerate, onReact, onExecuteCode }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        isUser 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
          : 'bg-gradient-to-br from-emerald-500 to-cyan-600'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : personaAvatar ? (
          <span className="text-lg">{personaAvatar}</span>
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-sm font-medium text-gray-300">
            {isUser ? 'You' : personaName || 'Assistant'}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.model && (
            <span className="text-xs px-2 py-0.5 bg-gray-700/50 rounded-full text-gray-400">
              {message.model}
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div className={`rounded-2xl p-4 ${
          isUser 
            ? 'bg-blue-600/20 border border-blue-500/30 text-gray-100' 
            : 'bg-gray-800/50 border border-gray-700/50 text-gray-200'
        }`}>
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <TypingIndicator />
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {renderMessageContent(message.content, onExecuteCode)}
            </div>
          )}
        </div>

        {/* Actions */}
        {!message.isStreaming && (
          <div className={`mt-2 ${isUser ? 'justify-end' : ''} flex`}>
            <MessageActions
              message={message}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              onReact={onReact}
            />
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            {message.error}
            <button className="text-blue-400 hover:underline" onClick={onRegenerate}>
              Retry
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Model selector dropdown
const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { providers, activeProvider, selectedModelId, setActiveProvider, setSelectedModel, getActiveModel } = useAIProviderStore();
  
  const activeModel = getActiveModel();
  const activeProviderData = providers.find(p => p.id === activeProvider);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition-colors"
      >
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-gray-300">
          {activeModel?.name || 'Select Model'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {providers.filter(p => p.models.length > 0).map((provider) => (
                <div key={provider.id}>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-900/50">
                    {provider.name}
                  </div>
                  {provider.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setActiveProvider(provider.id);
                        setSelectedModel(model.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-700/50 flex items-center justify-between ${
                        activeProvider === provider.id && selectedModelId === model.id
                          ? 'bg-blue-500/10 border-l-2 border-blue-500'
                          : ''
                      }`}
                    >
                      <div>
                        <div className="text-sm text-gray-200">{model.name}</div>
                        {model.contextWindow && (
                          <div className="text-xs text-gray-500">
                            {Math.round(model.contextWindow / 1000)}K context
                          </div>
                        )}
                      </div>
                      {activeProvider === provider.id && selectedModelId === model.id && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Suggestion chips
const suggestions = [
  { icon: <Code2 className="w-4 h-4" />, text: 'Explain this code', category: 'code' },
  { icon: <Terminal className="w-4 h-4" />, text: 'Write a bash script', category: 'code' },
  { icon: <FileCode className="w-4 h-4" />, text: 'Debug my function', category: 'debug' },
  { icon: <Zap className="w-4 h-4" />, text: 'Optimize performance', category: 'optimize' },
];

// Main enhanced chat component
export const EnhancedChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, currentConversationId, isLoading, sendMessage, regenerateMessage, setMessageReaction } = useChatStore();
  const { activeProvider, getActiveModel } = useAIProviderStore();
  const { selectedPersona, personas } = usePersonaStore();

  const currentMessages = useMemo(() => {
    return messages.filter(m => m.conversationId === currentConversationId);
  }, [messages, currentConversationId]);

  const currentPersona = useMemo(() => {
    return personas.find(p => p.id === selectedPersona);
  }, [personas, selectedPersona]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const model = getActiveModel();
    await sendMessage(input, {
      personaId: selectedPersona || undefined,
      model: model?.name,
    });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleRegenerate = async (messageId: string) => {
    await regenerateMessage(messageId);
  };

  const handleReact = (messageId: string, reaction: 'like' | 'dislike') => {
    const message = currentMessages.find(m => m.id === messageId);
    const newReaction = message?.reaction === reaction ? undefined : reaction;
    setMessageReaction(messageId, newReaction);
  };

  const handleExecuteCode = (code: string, lang: string) => {
    // Execute code in terminal (could integrate with terminal store)
    toast.info('Code execution', 'Opening in terminal...');
    // This could navigate to terminal page with pre-filled code
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {currentPersona && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <span className="text-lg">{currentPersona.avatar}</span>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-white">
              {currentPersona?.name || 'AI Assistant'}
            </h2>
            <p className="text-xs text-gray-400">
              {currentPersona?.description || 'Ready to help with code and commands'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ModelSelector />
          <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-400 mb-8 max-w-md">
              Ask questions about code, get explanations, debug issues, or just chat with your AI assistant.
            </p>
            
            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(suggestion.text)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl text-sm text-gray-300 hover:text-white transition-all hover:border-gray-600"
                >
                  {suggestion.icon}
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {currentMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                personaName={currentPersona?.name}
                personaAvatar={currentPersona?.avatar}
                onCopy={() => handleCopy(message.content)}
                onRegenerate={() => handleRegenerate(message.id)}
                onReact={(reaction) => handleReact(message.id, reaction)}
                onExecuteCode={handleExecuteCode}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        {/* Provider warning */}
        {!activeProvider && (
          <div className="flex items-center gap-2 px-4 py-2 mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            No AI provider configured. Go to Settings to set up an AI provider.
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Attachment buttons */}
          <div className="flex items-center gap-1 pb-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Attach file">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Add image">
              <Image className="w-5 h-5" />
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Shift+Enter for new line)"
              rows={1}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>

          {/* Voice/Send buttons */}
          <div className="flex items-center gap-1 pb-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !activeProvider}
              className={`p-3 rounded-xl transition-all ${
                input.trim() && !isLoading && activeProvider
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Send message"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {getActiveModel()?.name || 'No model selected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat;
