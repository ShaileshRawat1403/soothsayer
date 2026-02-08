import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  BookOpen,
  Bug,
  Sparkles,
  MessageSquare,
  RefreshCw,
  X,
  ExternalLink,
  Play,
  Terminal,
} from 'lucide-react';
import { useAIProviderStore } from '../../stores/ai-provider.store';

interface CodeExplanation {
  line: number;
  code: string;
  explanation: string;
  type: 'syntax' | 'logic' | 'best-practice' | 'warning' | 'tip';
  references?: string[];
}

interface SelectionExplanation {
  selection: string;
  startLine: number;
  endLine: number;
  explanation: string;
  suggestions?: string[];
  alternatives?: { code: string; description: string }[];
  loading?: boolean;
}

interface CodeExplainerProps {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
  onExecute?: (code: string) => void;
  onCopy?: (code: string) => void;
  enableAIExplanations?: boolean;
  theme?: 'dark' | 'light';
}

const languageMap: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  yml: 'yaml',
  md: 'markdown',
};

const typeIcons: Record<string, React.ReactNode> = {
  syntax: <Code2 className="w-3.5 h-3.5 text-blue-400" />,
  logic: <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />,
  'best-practice': <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
  warning: <Bug className="w-3.5 h-3.5 text-orange-400" />,
  tip: <Zap className="w-3.5 h-3.5 text-green-400" />,
};

const typeColors: Record<string, string> = {
  syntax: 'border-blue-500/30 bg-blue-500/10',
  logic: 'border-yellow-500/30 bg-yellow-500/10',
  'best-practice': 'border-purple-500/30 bg-purple-500/10',
  warning: 'border-orange-500/30 bg-orange-500/10',
  tip: 'border-green-500/30 bg-green-500/10',
};

// Built-in explanations for common patterns
const getBuiltInExplanations = (code: string, language: string): CodeExplanation[] => {
  const explanations: CodeExplanation[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // JavaScript/TypeScript patterns
    if (language === 'javascript' || language === 'typescript') {
      if (trimmedLine.startsWith('const ') || trimmedLine.startsWith('let ') || trimmedLine.startsWith('var ')) {
        const varType = trimmedLine.split(' ')[0];
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: varType === 'const' 
            ? 'Declares a constant that cannot be reassigned. Use for values that shouldn\'t change.'
            : varType === 'let'
            ? 'Declares a block-scoped variable that can be reassigned.'
            : 'Declares a function-scoped variable. Prefer const/let in modern JS.',
          type: varType === 'var' ? 'warning' : 'syntax',
        });
      }
      
      if (trimmedLine.includes('async ') || trimmedLine.includes('await ')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Async/await syntax for handling Promises. Makes asynchronous code look synchronous and easier to read.',
          type: 'syntax',
          references: ['MDN: async function', 'JavaScript.info: Async/await'],
        });
      }
      
      if (trimmedLine.includes('.map(') || trimmedLine.includes('.filter(') || trimmedLine.includes('.reduce(')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Array method that creates a new array. Functional programming pattern - immutable and chainable.',
          type: 'best-practice',
        });
      }
      
      if (trimmedLine.includes('useEffect') || trimmedLine.includes('useState') || trimmedLine.includes('useCallback')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'React Hook for managing component state or side effects. Hooks must be called at the top level.',
          type: 'syntax',
          references: ['React Docs: Hooks'],
        });
      }
      
      if (trimmedLine.includes('try {') || trimmedLine.includes('catch (')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Error handling block. Always handle errors gracefully to prevent crashes.',
          type: 'best-practice',
        });
      }
      
      if (trimmedLine.includes('// TODO') || trimmedLine.includes('// FIXME')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Developer note indicating pending work or known issue that needs attention.',
          type: 'warning',
        });
      }
    }
    
    // Python patterns
    if (language === 'python') {
      if (trimmedLine.startsWith('def ') || trimmedLine.startsWith('async def ')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Function definition. async def creates a coroutine for asynchronous execution.',
          type: 'syntax',
        });
      }
      
      if (trimmedLine.startsWith('class ')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Class definition for object-oriented programming. Blueprint for creating objects.',
          type: 'syntax',
        });
      }
      
      if (trimmedLine.includes('with ')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Context manager ensuring proper resource cleanup (files, connections, locks).',
          type: 'best-practice',
        });
      }
      
      if (trimmedLine.startsWith('@')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Decorator pattern - modifies or extends function/class behavior without changing its code.',
          type: 'syntax',
        });
      }
    }
    
    // SQL patterns
    if (language === 'sql') {
      if (trimmedLine.toUpperCase().startsWith('SELECT')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Query to retrieve data from database tables. Use specific columns instead of * for performance.',
          type: 'tip',
        });
      }
      
      if (trimmedLine.toUpperCase().includes('JOIN')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Combines rows from multiple tables based on a related column.',
          type: 'syntax',
        });
      }
    }
    
    // Bash patterns
    if (language === 'bash') {
      if (trimmedLine.startsWith('#!/')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Shebang - tells the system which interpreter to use for this script.',
          type: 'syntax',
        });
      }
      
      if (trimmedLine.includes('| ')) {
        explanations.push({
          line: index + 1,
          code: trimmedLine,
          explanation: 'Pipe - sends output of one command as input to another. Unix philosophy.',
          type: 'syntax',
        });
      }
    }
  });

  return explanations;
};

export const CodeExplainer: React.FC<CodeExplainerProps> = ({
  code,
  language: rawLanguage,
  title,
  showLineNumbers = true,
  onExecute,
  onCopy,
  enableAIExplanations = true,
  theme = 'dark',
}) => {
  const language = languageMap[rawLanguage] || rawLanguage;
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionExplanation, setSelectionExplanation] = useState<SelectionExplanation | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const [explanations, setExplanations] = useState<CodeExplanation[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const codeRef = useRef<HTMLPreElement>(null);
  const { activeProvider, getActiveModel, sendMessage } = useAIProviderStore();

  // Get built-in explanations
  useEffect(() => {
    setExplanations(getBuiltInExplanations(code, language));
  }, [code, language]);

  // Syntax highlighting
  const highlightedCode = React.useMemo(() => {
    try {
      const grammar = Prism.languages[language] || Prism.languages.plaintext;
      return Prism.highlight(code, grammar, language);
    } catch {
      return code;
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedStr = selection.toString().trim();
      setSelectedText(selectedStr);
      
      // Calculate position for tooltip
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    } else {
      setSelectedText(null);
      setSelectionExplanation(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  const explainSelection = async () => {
    if (!selectedText || !enableAIExplanations) return;

    // Find line numbers for selection
    const lines = code.split('\n');
    let startLine = 1;
    let endLine = 1;
    let charCount = 0;
    const selectionStart = code.indexOf(selectedText);
    
    for (let i = 0; i < lines.length; i++) {
      if (charCount <= selectionStart && selectionStart < charCount + lines[i].length + 1) {
        startLine = i + 1;
      }
      if (charCount <= selectionStart + selectedText.length && selectionStart + selectedText.length <= charCount + lines[i].length + 1) {
        endLine = i + 1;
        break;
      }
      charCount += lines[i].length + 1;
    }

    setSelectionExplanation({
      selection: selectedText,
      startLine,
      endLine,
      explanation: '',
      loading: true,
    });

    // Check if AI provider is configured
    if (activeProvider) {
      try {
        const prompt = `Explain this ${language} code snippet concisely (2-3 sentences max):

\`\`\`${language}
${selectedText}
\`\`\`

Also suggest any improvements if applicable.`;

        const response = await sendMessage(prompt);
        
        setSelectionExplanation({
          selection: selectedText,
          startLine,
          endLine,
          explanation: response,
          loading: false,
        });
      } catch (error) {
        // Fallback to built-in explanation
        setSelectionExplanation({
          selection: selectedText,
          startLine,
          endLine,
          explanation: generateFallbackExplanation(selectedText, language),
          loading: false,
        });
      }
    } else {
      // No AI provider - use fallback
      setSelectionExplanation({
        selection: selectedText,
        startLine,
        endLine,
        explanation: generateFallbackExplanation(selectedText, language),
        loading: false,
      });
    }
  };

  const generateFallbackExplanation = (selection: string, lang: string): string => {
    const trimmed = selection.trim();
    
    // Common patterns
    if (trimmed.includes('=>')) {
      return 'Arrow function expression - a concise syntax for writing function expressions with lexical `this` binding.';
    }
    if (trimmed.includes('async') || trimmed.includes('await')) {
      return 'Asynchronous code using async/await syntax for cleaner Promise handling.';
    }
    if (trimmed.includes('.then(')) {
      return 'Promise chain - handles asynchronous operations sequentially.';
    }
    if (trimmed.match(/\[\s*\.\.\./)) {
      return 'Spread operator in array - expands iterable elements into a new array.';
    }
    if (trimmed.match(/\{\s*\.\.\./)) {
      return 'Spread operator in object - creates a shallow copy with merged properties.';
    }
    if (trimmed.includes('?.')) {
      return 'Optional chaining - safely access nested properties without null checks.';
    }
    if (trimmed.includes('??')) {
      return 'Nullish coalescing - returns right operand when left is null/undefined.';
    }
    
    return `This ${lang} code snippet performs a specific operation. Select an AI provider in settings for detailed explanations.`;
  };

  const toggleLineExplanation = (lineNumber: number) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber);
    } else {
      newExpanded.add(lineNumber);
    }
    setExpandedLines(newExpanded);
  };

  const lines = code.split('\n');
  const explanationsByLine = explanations.reduce((acc, exp) => {
    acc[exp.line] = exp;
    return acc;
  }, {} as Record<number, CodeExplanation>);

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';

  return (
    <div className={`rounded-xl overflow-hidden ${bgColor} ${borderColor} border shadow-lg`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200'} border-b ${borderColor}`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          {title && (
            <span className={`text-sm font-medium ${textColor}`}>{title}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'}`}>
            {language}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {enableAIExplanations && (
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className={`p-1.5 rounded-lg transition-all ${
                showExplanations 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-300 text-gray-600'
              }`}
              title="Toggle explanations"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
          
          {onExecute && (
            <button
              onClick={() => onExecute(code)}
              className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-green-400' : 'hover:bg-gray-300 text-gray-600 hover:text-green-600'}`}
              title="Execute code"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-300 text-gray-600'}`}
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="relative overflow-x-auto">
        <pre
          ref={codeRef}
          className={`p-4 text-sm font-mono ${textColor} leading-relaxed`}
          style={{ tabSize: 2 }}
        >
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const hasExplanation = explanationsByLine[lineNumber];
            const isExpanded = expandedLines.has(lineNumber);

            return (
              <div key={lineNumber} className="group">
                <div className="flex items-start">
                  {showLineNumbers && (
                    <span 
                      className={`select-none w-10 pr-4 text-right flex-shrink-0 cursor-pointer transition-colors ${
                        hasExplanation 
                          ? 'text-blue-400 hover:text-blue-300' 
                          : theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      }`}
                      onClick={() => hasExplanation && toggleLineExplanation(lineNumber)}
                      title={hasExplanation ? 'Click for explanation' : undefined}
                    >
                      {hasExplanation && (
                        <span className="inline-block mr-1">
                          {isExpanded ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronRight className="w-3 h-3 inline" />}
                        </span>
                      )}
                      {lineNumber}
                    </span>
                  )}
                  <code
                    className="flex-1"
                    dangerouslySetInnerHTML={{
                      __html: Prism.highlight(line || ' ', Prism.languages[language] || Prism.languages.plaintext, language),
                    }}
                  />
                  {hasExplanation && showExplanations && !isExpanded && (
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {typeIcons[hasExplanation.type]}
                    </span>
                  )}
                </div>
                
                {/* Inline Explanation */}
                <AnimatePresence>
                  {hasExplanation && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`ml-10 my-2 p-3 rounded-lg border ${typeColors[hasExplanation.type]}`}
                    >
                      <div className="flex items-start gap-2">
                        {typeIcons[hasExplanation.type]}
                        <div className="flex-1">
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {hasExplanation.explanation}
                          </p>
                          {hasExplanation.references && (
                            <div className="flex gap-2 mt-2">
                              {hasExplanation.references.map((ref, i) => (
                                <a
                                  key={i}
                                  href={`https://www.google.com/search?q=${encodeURIComponent(ref)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {ref}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Selection Tooltip */}
      <AnimatePresence>
        {selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-50 flex items-center gap-1 p-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <button
              onClick={explainSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              disabled={selectionExplanation?.loading}
            >
              {selectionExplanation?.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lightbulb className="w-3.5 h-3.5" />
              )}
              Explain
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedText(null)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Explanation Panel */}
      <AnimatePresence>
        {selectionExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border-t ${borderColor}`}
          >
            <div className={`p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className={`text-sm font-medium ${textColor}`}>
                    Explanation (Lines {selectionExplanation.startLine}-{selectionExplanation.endLine})
                  </span>
                </div>
                <button
                  onClick={() => setSelectionExplanation(null)}
                  className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-300'}`}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {selectionExplanation.loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing code...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <pre className={`p-3 rounded-lg text-sm font-mono ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'} overflow-x-auto`}>
                    <code>{selectionExplanation.selection}</code>
                  </pre>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed whitespace-pre-wrap`}>
                    {selectionExplanation.explanation}
                  </p>
                  
                  {selectionExplanation.suggestions && selectionExplanation.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Suggestions</h4>
                      <ul className="space-y-1">
                        {selectionExplanation.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <Zap className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer with stats */}
      <div className={`flex items-center justify-between px-4 py-2 text-xs ${theme === 'dark' ? 'bg-gray-800/30 text-gray-500' : 'bg-gray-200/50 text-gray-600'} border-t ${borderColor}`}>
        <span>{lines.length} lines</span>
        <div className="flex items-center gap-4">
          {explanations.length > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {explanations.length} explanations
            </span>
          )}
          {activeProvider && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              AI: {getActiveModel()?.name || activeProvider}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeExplainer;
