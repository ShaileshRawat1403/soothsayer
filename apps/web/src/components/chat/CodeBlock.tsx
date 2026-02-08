import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Play,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Terminal,
  Code,
  Wand2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

interface CodeExplanation {
  line: number;
  explanation: string;
  type: 'info' | 'warning' | 'tip';
}

// Simple syntax highlighting keywords
const KEYWORDS: Record<string, string[]> = {
  typescript: ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'import', 'from', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'implements', 'static', 'private', 'public', 'protected', 'readonly', 'enum', 'namespace', 'module', 'declare', 'as', 'is', 'in', 'of', 'typeof', 'instanceof', 'keyof', 'null', 'undefined', 'true', 'false', 'void', 'never', 'any', 'unknown', 'string', 'number', 'boolean', 'object', 'symbol', 'bigint'],
  javascript: ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'static', 'null', 'undefined', 'true', 'false'],
  python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'async', 'await', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'pass', 'break', 'continue', 'global', 'nonlocal'],
  sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'LIMIT', 'OFFSET'],
};

export function CodeBlock({ code, language = 'typescript', filename, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [explanations, setExplanations] = useState<CodeExplanation[]>([]);
  const [isExplaining, setIsExplaining] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const lines = code.split('\n');

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSyntax = (line: string): React.ReactNode[] => {
    const keywords = KEYWORDS[language] || KEYWORDS.typescript;
    const parts: React.ReactNode[] = [];
    
    // Simple regex-based highlighting
    const regex = new RegExp(
      `(${keywords.join('|')})|` + // Keywords
      `("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|` + // Strings
      `(\/\/.*$|\/\*[\s\S]*?\*\/)|` + // Comments
      `(\\b\\d+(?:\\.\\d+)?\\b)|` + // Numbers
      `([{}\\[\\]().,;:])`, // Punctuation
      'g'
    );

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{line.slice(lastIndex, match.index)}</span>);
      }

      const [fullMatch, keyword, string, comment, number, punctuation] = match;

      if (keyword) {
        parts.push(<span key={`kw-${match.index}`} className="text-purple-400 font-medium">{fullMatch}</span>);
      } else if (string) {
        parts.push(<span key={`str-${match.index}`} className="text-green-400">{fullMatch}</span>);
      } else if (comment) {
        parts.push(<span key={`cmt-${match.index}`} className="text-gray-500 italic">{fullMatch}</span>);
      } else if (number) {
        parts.push(<span key={`num-${match.index}`} className="text-orange-400">{fullMatch}</span>);
      } else if (punctuation) {
        parts.push(<span key={`punc-${match.index}`} className="text-gray-400">{fullMatch}</span>);
      } else {
        parts.push(<span key={`other-${match.index}`}>{fullMatch}</span>);
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(<span key={`end-${lastIndex}`}>{line.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : [<span key="full">{line}</span>];
  };

  const handleLineClick = (lineNum: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedLines.length > 0) {
      // Range selection
      const lastSelected = selectedLines[selectedLines.length - 1];
      const start = Math.min(lastSelected, lineNum);
      const end = Math.max(lastSelected, lineNum);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedLines(range);
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedLines((prev) =>
        prev.includes(lineNum)
          ? prev.filter((l) => l !== lineNum)
          : [...prev, lineNum]
      );
    } else {
      // Single selection
      setSelectedLines([lineNum]);
    }
  };

  const explainSelectedCode = async () => {
    if (selectedLines.length === 0) {
      toast.info('Select code lines to explain (click line numbers)');
      return;
    }

    setIsExplaining(true);
    setShowExplanation(true);

    // Simulate AI explanation generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newExplanations: CodeExplanation[] = selectedLines.map((lineNum) => {
      const line = lines[lineNum - 1]?.trim() || '';
      let explanation = '';
      let type: CodeExplanation['type'] = 'info';

      // Generate contextual explanations based on code content
      if (line.includes('async') || line.includes('await')) {
        explanation = 'This line uses async/await syntax for handling asynchronous operations. It allows writing asynchronous code in a synchronous style.';
        type = 'tip';
      } else if (line.includes('interface') || line.includes('type')) {
        explanation = 'Defines a TypeScript type or interface for type-safe object structures.';
        type = 'info';
      } else if (line.includes('try') || line.includes('catch')) {
        explanation = 'Error handling block. Wraps potentially failing code to gracefully handle exceptions.';
        type = 'warning';
      } else if (line.includes('const') || line.includes('let')) {
        explanation = 'Variable declaration. `const` for immutable references, `let` for mutable variables.';
        type = 'info';
      } else if (line.includes('function') || line.includes('=>')) {
        explanation = 'Function declaration or arrow function. Encapsulates reusable logic.';
        type = 'info';
      } else if (line.includes('return')) {
        explanation = 'Returns a value from the function and exits the function execution.';
        type = 'info';
      } else if (line.includes('import') || line.includes('export')) {
        explanation = 'Module import/export. Manages code organization and dependencies.';
        type = 'info';
      } else if (line.includes('//')) {
        explanation = 'Code comment. Documents the purpose or behavior of code.';
        type = 'tip';
      } else {
        explanation = 'This line performs a specific operation in the program flow.';
        type = 'info';
      }

      return { line: lineNum, explanation, type };
    });

    setExplanations(newExplanations);
    setIsExplaining(false);
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-border bg-[#1e1e2e] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          {filename && (
            <span className="text-sm text-gray-400 font-mono">{filename}</span>
          )}
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
            {language}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={explainSelectedCode}
            disabled={isExplaining}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              selectedLines.length > 0
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "text-gray-400 hover:bg-white/10"
            )}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {isExplaining ? 'Explaining...' : 'Explain'}
            {selectedLines.length > 0 && (
              <span className="ml-1 rounded bg-amber-500/30 px-1.5 py-0.5">
                {selectedLines.length}
              </span>
            )}
          </button>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="relative overflow-x-auto">
        <pre ref={codeRef} className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, index) => {
              const lineNum = index + 1;
              const isSelected = selectedLines.includes(lineNum);
              const isHovered = hoveredLine === lineNum;
              const hasExplanation = explanations.some((e) => e.line === lineNum);

              return (
                <div
                  key={lineNum}
                  className={cn(
                    'flex transition-colors',
                    isSelected && 'bg-amber-500/10',
                    isHovered && !isSelected && 'bg-white/5'
                  )}
                  onMouseEnter={() => setHoveredLine(lineNum)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  {showLineNumbers && (
                    <span
                      onClick={(e) => handleLineClick(lineNum, e)}
                      className={cn(
                        'mr-4 min-w-[3ch] select-none text-right cursor-pointer transition-colors',
                        isSelected ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
                      )}
                    >
                      {lineNum}
                    </span>
                  )}
                  <span className="flex-1 text-gray-300">
                    {highlightSyntax(line)}
                  </span>
                  {hasExplanation && (
                    <Lightbulb className="ml-2 h-4 w-4 text-amber-400 animate-pulse" />
                  )}
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {/* Explanations Panel */}
      {showExplanation && explanations.length > 0 && (
        <div className="border-t border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <Lightbulb className="h-4 w-4" />
              Code Explanation
            </h4>
            <button
              onClick={() => {
                setShowExplanation(false);
                setExplanations([]);
                setSelectedLines([]);
              }}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {explanations.map((exp) => (
              <div
                key={exp.line}
                className={cn(
                  'rounded-lg p-3 text-sm',
                  exp.type === 'info' && 'bg-blue-500/10 border border-blue-500/20',
                  exp.type === 'warning' && 'bg-amber-500/10 border border-amber-500/20',
                  exp.type === 'tip' && 'bg-green-500/10 border border-green-500/20'
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-gray-400">
                    Line {exp.line}
                  </span>
                  <p className="flex-1 text-gray-300">{exp.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection hint */}
      {selectedLines.length === 0 && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
            Click line numbers to select & explain
          </span>
        </div>
      )}
    </div>
  );
}
