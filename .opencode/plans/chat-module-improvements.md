# Soothsayer Chat Module Improvements

## Overview

Comprehensive improvements to the Soothsayer chat module addressing critical bugs, architectural issues, dead code, and missing features. All changes will be implemented on the `improve-chat-module` branch.

---

## Task 1: Add Streaming Responses (SSE)

### Problem

All AI provider calls are synchronous/blocking. Users wait for the full response with no feedback. The types define `StreamingChatResponse` and WebSocket infrastructure exists, but the actual chat endpoint does not stream.

### Changes Required

#### 1.1 Backend: Add streaming methods to `ai-provider.service.ts`

**File:** `apps/api/src/modules/chat/ai-provider.service.ts`

Add a new `streamGenerateReply()` async generator method that yields chunks for:

- **Ollama**: Stream from `/api/chat` with `stream: true`, parse NDJSON lines for `message.content`
- **OpenAI/Groq**: Stream from `/chat/completions` with `stream: true`, parse SSE `data:` lines for `choices[0].delta.content`
- **Bedrock**: Use `ConverseCommand` (note: Bedrock Converse API doesn't natively stream in the SDK; return full text as single chunk or use `ConverseStreamCommand` if available)
- **DAX**: Not suitable for streaming (run-based); return handoff message immediately

Key implementation details:

- Use `AsyncIterable<string>` return type for the generator
- Use native `fetch()` with `response.body.getReader()` for streaming HTTP responses
- Handle Ollama's NDJSON format (each line is a JSON object)
- Handle OpenAI's SSE format (`data: {...}` lines, ending with `data: [DONE]`)
- Preserve all existing context building (system prompt, message history, file context, MCP results)

#### 1.2 Backend: Add streaming endpoint to `chat.controller.ts`

**File:** `apps/api/src/modules/chat/chat.controller.ts`

Add new endpoint:

```typescript
@Post('conversations/:id/messages/stream')
@ApiOperation({ summary: 'Send a message with streaming response' })
async sendMessageStream(
  @Param('id') id: string,
  @GetCurrentUser() user: CurrentUser,
  @Body() dto: SendMessageDto,
  @Res() res: Response,
)
```

Implementation:

- Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Create user message in DB (same as non-streaming)
- Evaluate handoff decision (same as non-streaming)
- If handoff needed: return handoff metadata as SSE event and close
- If no handoff: iterate `aiProvider.streamGenerateReply()` and yield each chunk as `data: {"type":"chunk","content":"..."}`
- On completion: yield `data: {"type":"done","messageId":"..."}` and save assistant message to DB
- On error: yield `data: {"type":"error","message":"..."}` and close

#### 1.3 Backend: Add streaming method to `chat.service.ts`

**File:** `apps/api/src/modules/chat/chat.service.ts`

Add `sendMessageStream()` method that:

- Creates user message in DB
- Evaluates handoff (same logic as `sendMessage`)
- Returns an async generator that yields `{ type: 'chunk' | 'done' | 'error' | 'handoff', data: any }`
- Saves the complete assistant message to DB after streaming completes

#### 1.4 Frontend: Add streaming support to `api.ts`

**File:** `apps/web/src/lib/api.ts`

Add new API helper:

```typescript
async function sendMessageStream(
  conversationId: string,
  data: { content: string; provider?: string; model?: string }
): Promise<EventSource | AsyncIterable<string>>;
```

Use `fetch()` with readable stream reader (not EventSource, since we need POST):

- POST to `/chat/conversations/:id/messages/stream`
- Read response body as stream
- Parse SSE events and yield chunks

#### 1.5 Frontend: Update `ChatPage.tsx` for streaming

**File:** `apps/web/src/pages/ChatPage.tsx`

Modify `handleSend()`:

- Add optional `useStreaming` parameter (default true for non-DAX providers)
- When streaming: create optimistic assistant message with `isStreaming: true`
- Append chunks to the assistant message content in real-time
- On `done` event: mark message as complete
- On `error` event: show error toast
- Keep existing non-streaming path as fallback for DAX handoff scenarios

---

## Task 2: Consolidate Chat Components

### Problem

`EnhancedChat.tsx` is a fully-featured component (model selector, reactions, code execution, voice input) but is NOT routed. `ChatPage.tsx` manages its own local state instead of using the Zustand `chat.store.ts`. This is dead code and a maintenance burden.

### Changes Required

#### 2.1 Merge EnhancedChat features into ChatPage

**File:** `apps/web/src/pages/ChatPage.tsx`

Add the following features from EnhancedChat that are missing in ChatPage:

- **Model selector dropdown**: Port the `ModelSelector` component from EnhancedChat into ChatPage header (replace the static provider display)
- **Message actions**: Add copy, regenerate, like/dislike buttons on hover (from `MessageActions` in EnhancedChat)
- **Typing indicator**: Add the `TypingIndicator` component for loading states
- **Suggestion chips**: Port the suggestion chips from EnhancedChat to the empty state

#### 2.2 Wire up Zustand store

**File:** `apps/web/src/stores/chat.store.ts`

The store already has the right structure. Add missing actions:

```typescript
sendMessage: (content: string, options?: { provider?: string; model?: string }) => Promise<void>
regenerateMessage: (messageId: string) => Promise<void>
setMessageReaction: (messageId: string, reaction: 'like' | 'dislike' | undefined) => void
```

#### 2.3 Update ChatPage to use Zustand store

**File:** `apps/web/src/pages/ChatPage.tsx`

Replace local state management with Zustand:

- Replace `useState<Message[]>([])` with `useChatStore` selectors
- Replace `useState(isLoading)` with store's `isLoading`
- Use store's `addMessage`, `updateMessage` actions
- Keep DAX-specific state (runStatuses, pendingApproval) as local state since it's chat-page-specific

#### 2.4 Remove EnhancedChat from routing consideration

**File:** `apps/web/src/components/chat/EnhancedChat.tsx`

Add a deprecation comment at the top. The component can remain as a reference but should not be imported anywhere. Consider deleting it after migration is complete.

---

## Task 3: Fix DAX Polling Architecture

### Problem

`waitForDaxTerminal()` in `ai-provider.service.ts:399-449` blocks the entire HTTP request with polling (1.5s intervals, up to 600s timeout). This will cause gateway timeouts.

### Changes Required

#### 3.1 Replace blocking DAX polling with async job pattern

**File:** `apps/api/src/modules/chat/ai-provider.service.ts`

Modify `callDaxAssistant()`:

- Instead of calling `waitForDaxTerminal()` which blocks, create the DAX run and return immediately with a handoff response
- The response should include `runId`, initial status, and `targetPath`
- The frontend will poll for status (already implemented in ChatPage)

This is actually already the correct pattern for the handoff path. The issue is when DAX is used as the **primary provider** (not handoff) - in that case `callDaxAssistant` blocks. Fix:

- Add `DAX_CHAT_INLINE_WAIT_MS` env var check (already exists at line 408)
- If the run exceeds the inline wait window, return a handoff response instead of continuing to poll
- The `shouldKeepInlineConversation()` method (line 508) already handles this logic - ensure it's called before polling starts

#### 3.2 Add SSE endpoint for DAX run status

**File:** `apps/api/src/modules/dax/dax.controller.ts`

Add new endpoint:

```typescript
@Get('runs/:id/stream')
async streamRunEvents(
  @Param('id') runId: string,
  @Res() res: Response,
)
```

This proxies to DAX's existing SSE event stream (`/runs/:id/events`) so the frontend can subscribe to real-time updates instead of polling.

#### 3.3 Update frontend to use SSE for DAX runs

**File:** `apps/web/src/pages/ChatPage.tsx`

Replace the `useEffect` polling loop (lines 338-373) with:

- Use `EventSource` to connect to `/dax/runs/:id/stream` for each active run
- Parse SSE events and update `runStatuses` state
- Fall back to polling if SSE is not available
- Clean up EventSource connections on unmount

---

## Task 4: Improve Handoff Engine

### Problem

`PoliciesService.evaluateHandoff()` uses hardcoded regex patterns. Has a TODO acknowledging the full policy engine isn't implemented.

### Changes Required

#### 4.1 Add AI-driven intent classification

**File:** `apps/api/src/modules/policies/policies.service.ts`

Add a new `evaluateHandoffWithAI()` method that:

- Uses the configured AI provider (Ollama/OpenAI/Groq/Bedrock) to classify the user's intent
- Sends a lightweight classification prompt:

  ```
  Classify this user message into one of these categories:
  - "chat": General conversation, questions, explanations, brainstorming
  - "execution": Requests to create, modify, run, or change code/systems
  - "analysis": Requests to inspect, review, scan, or investigate

  Respond with only the category name.

  User message: "{input}"
  ```

- Maps categories to handoff decisions:
  - `chat` -> no handoff
  - `execution` -> handoff with approval required
  - `analysis` -> handoff without approval (read-only)
- Falls back to regex-based `getLegacyRegexDecision()` if AI classification fails or AI provider is not configured
- Add `POLICY_AI_CLASSIFICATION_ENABLED` env var to toggle this feature (default: false for safety)

#### 4.2 Implement proper policy rule evaluation

**File:** `apps/api/src/modules/policies/policies.service.ts`

Implement the TODO at line 29:

- Iterate through fetched `policies` and evaluate their `rules` (stored as JSON in the database)
- Support rule types: `keyword_match`, `regex_match`, `ai_classify`
- Respect policy `priority` ordering
- Return the highest-priority matching decision

---

## Task 5: Enable MCP Auto-Triggering

### Problem

`McpService.preflight()` returns `null` unless an explicit tool is requested. MCP tools are never automatically triggered by chat content.

### Changes Required

#### 5.1 Add AI-driven tool classification

**File:** `apps/api/src/modules/mcp/mcp.service.ts`

Implement the TODO at line 343:

- Add `classifyToolIntent()` method that uses AI to determine if an MCP tool should be called
- Send a classification prompt with available tools and user input:

  ```
  Available tools: {tool_list}
  User message: "{content}"

  Should any tool be called? Respond with JSON: {"tool": "name", "args": {...}} or {"tool": null}
  ```

- Cache tool definitions to avoid repeated lookups
- Add `MCP_AUTO_TRIGGER_ENABLED` env var (default: false)

#### 5.2 Update preflight to use AI classification

**File:** `apps/api/src/modules/mcp/mcp.service.ts`

Modify `preflight()`:

- If `MCP_AUTO_TRIGGER_ENABLED=true`, call `classifyToolIntent()`
- If a tool is identified, return `{ selectedTool, suggestedArgs, reason: 'AI-classified' }`
- If no tool identified, return `null` (existing behavior)
- Always respect explicit tool requests (existing behavior)

---

## Task 6: Add Message Regeneration

### Problem

Frontend has a "Regenerate" button concept, but no backend endpoint exists. The `RegenerateMessageRequest/Response` types exist in `packages/types` but are not implemented.

### Changes Required

#### 6.1 Backend: Add regeneration endpoint

**File:** `apps/api/src/modules/chat/chat.controller.ts`

Add new endpoint:

```typescript
@Post('conversations/:id/messages/:messageId/regenerate')
@ApiOperation({ summary: 'Regenerate an assistant message' })
async regenerateMessage(
  @Param('id') id: string,
  @Param('messageId') messageId: string,
  @GetCurrentUser() user: CurrentUser,
  @Body() dto: RegenerateMessageDto,
)
```

#### 6.2 Backend: Add regeneration logic to `chat.service.ts`

**File:** `apps/api/src/modules/chat/chat.service.ts`

Add `regenerateMessage()` method:

- Find the conversation and verify ownership
- Find the message to regenerate (must be assistant message)
- Get the conversation history up to that point (all messages before the one being regenerated)
- Get the user message that triggered the original assistant response (the parent message)
- Call the AI provider with the same context (same provider/model if stored in metadata)
- Delete the old assistant message
- Create a new assistant message with the new response
- Return the new message

#### 6.3 Frontend: Add regeneration to ChatPage

**File:** `apps/web/src/pages/ChatPage.tsx`

Add `handleRegenerate(messageId)` function:

- Call `POST /chat/conversations/:id/messages/:messageId/regenerate`
- Replace the old assistant message with the new one in local state
- Show toast on success/error
- Wire up to the regenerate button in message actions

---

## Task 7: Replace Custom Markdown with react-markdown

### Problem

`MessageContent.tsx` uses regex-based markdown replacement instead of a proper library. This breaks on complex markdown.

### Changes Required

#### 7.1 Add react-markdown dependency

**File:** `apps/web/package.json`

Add:

```json
"react-markdown": "^9.0.1",
"remark-gfm": "^4.0.0",
"rehype-highlight": "^7.0.0"
```

#### 7.2 Replace MessageContent implementation

**File:** `apps/web/src/components/chat/MessageContent.tsx`

Replace the regex-based `renderMarkdown()` function with:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

export function MessageContent({ content, isUser, isStreaming }: MessageContentProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-sm">
                {children}
              </code>
            );
          }
          return (
            <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1] || 'text'} />
          );
        },
        // Custom components for other markdown elements as needed
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

---

## Task 8: Fix Polling, window.innerWidth Bug, and Add Pagination

### Problem

1. Run status polling re-subscribes on every state change (inefficient)
2. `window.innerWidth < 640` at render time doesn't update on resize
3. `findConversation` hardcodes `take: 100` with no pagination

### Changes Required

#### 8.1 Fix polling inefficiency

**File:** `apps/web/src/pages/ChatPage.tsx`

Replace the polling `useEffect` (lines 338-373) with a `useRef`-based approach:

- Store active run IDs in a `useRef` to avoid re-subscription
- Use `useCallback` for the poll function
- Only re-subscribe when the set of run IDs actually changes (not on every status update)
- Use `clearInterval` properly on cleanup

#### 8.2 Fix window.innerWidth bug

**File:** `apps/web/src/pages/ChatPage.tsx`

Replace the hardcoded `window.innerWidth < 640` (line 740) with:

- Add a `useIsMobile` hook using `useState` + `useEffect` with a resize listener
- Or use CSS media queries via Tailwind classes (preferred)
- The motion `animate` prop should use a state variable, not a direct `window` access

#### 8.3 Add message pagination

**File:** `apps/api/src/modules/chat/conversation.service.ts`

Modify `findConversation()`:

- Accept `cursor` and `limit` parameters
- Use cursor-based pagination for messages (ordered by `createdAt DESC`)
- Default limit: 50 messages
- Return `hasMore` flag and `nextCursor` for pagination

**File:** `apps/api/src/modules/chat/chat.controller.ts`

Update `findConversation` endpoint to accept query params:

```typescript
@Get('conversations/:id')
async findConversation(
  @Param('id') id: string,
  @GetCurrentUser() user: CurrentUser,
  @Query('cursor') cursor?: string,
  @Query('limit') limit?: number,
)
```

**File:** `apps/web/src/pages/ChatPage.tsx`

Add "Load older messages" button at the top of the message list when `hasMore` is true.

---

## Implementation Order

1. **Task 8.2** (window.innerWidth fix) - Quick win, low risk
2. **Task 8.1** (polling fix) - Quick win, improves performance immediately
3. **Task 7** (react-markdown) - Dependency addition, improves rendering quality
4. **Task 6** (message regeneration) - New feature, backend + frontend
5. **Task 1** (streaming responses) - Major UX improvement, requires backend + frontend changes
6. **Task 3** (DAX polling fix) - Critical reliability fix
7. **Task 5** (MCP auto-triggering) - Feature enhancement
8. **Task 4** (handoff engine) - Architectural improvement
9. **Task 2** (component consolidation) - Cleanup and deduplication

## Risk Assessment

| Task                | Risk              | Rollback Complexity              |
| ------------------- | ----------------- | -------------------------------- |
| 1. Streaming        | Medium            | Remove endpoint, revert frontend |
| 2. Consolidation    | Low               | Revert branch                    |
| 3. DAX polling      | Medium            | Revert to blocking pattern       |
| 4. Handoff engine   | Low (behind flag) | Toggle env var off               |
| 5. MCP auto-trigger | Low (behind flag) | Toggle env var off               |
| 6. Regeneration     | Low               | Remove endpoint                  |
| 7. react-markdown   | Low               | Remove dependency                |
| 8. Bug fixes        | Very Low          | Revert changes                   |

## Testing Strategy

For each task:

1. Unit tests for new service methods
2. Integration tests for new endpoints
3. Manual testing of the UI changes
4. Verify backward compatibility (existing non-streaming endpoint still works)
