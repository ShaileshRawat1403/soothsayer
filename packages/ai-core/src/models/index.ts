// Model Adapters for The Soothsayer

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  config: Partial<ModelConfig>;
  functions?: FunctionDefinition[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  content: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Base Model Adapter
export abstract class ModelAdapter {
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract streamChat(
    request: ChatCompletionRequest,
    onToken: (token: string) => void
  ): Promise<ChatCompletionResponse>;
}

// OpenAI Adapter
export class OpenAIAdapter extends ModelAdapter {
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.config.model || this.config.model,
        messages: request.messages,
        max_tokens: request.config.maxTokens || this.config.maxTokens,
        temperature: request.config.temperature ?? this.config.temperature,
        top_p: request.config.topP ?? this.config.topP,
        functions: request.functions,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      id: data.id,
      content: choice.message.content || '',
      functionCall: choice.message.function_call
        ? {
            name: choice.message.function_call.name,
            arguments: JSON.parse(choice.message.function_call.arguments),
          }
        : undefined,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: choice.finish_reason,
    };
  }

  async streamChat(
    request: ChatCompletionRequest,
    onToken: (token: string) => void
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.config.model || this.config.model,
        messages: request.messages,
        max_tokens: request.config.maxTokens || this.config.maxTokens,
        temperature: request.config.temperature ?? this.config.temperature,
        top_p: request.config.topP ?? this.config.topP,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finishReason: ChatCompletionResponse['finishReason'] = 'stop';
    let responseId = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          responseId = parsed.id;
          const delta = parsed.choices[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
            onToken(delta.content);
          }
          
          if (parsed.choices[0]?.finish_reason) {
            finishReason = parsed.choices[0].finish_reason;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return {
      id: responseId,
      content: fullContent,
      usage: {
        promptTokens: 0, // Not available in streaming
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason,
    };
  }
}

// Model Registry
export class ModelRegistry {
  private adapters: Map<string, ModelAdapter> = new Map();
  private defaultModel: string | null = null;

  registerAdapter(name: string, adapter: ModelAdapter): void {
    this.adapters.set(name, adapter);
    if (!this.defaultModel) {
      this.defaultModel = name;
    }
  }

  getAdapter(name?: string): ModelAdapter {
    const adapterName = name || this.defaultModel;
    if (!adapterName) {
      throw new Error('No model adapter registered');
    }

    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Model adapter not found: ${adapterName}`);
    }

    return adapter;
  }

  setDefaultModel(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Model adapter not found: ${name}`);
    }
    this.defaultModel = name;
  }

  listModels(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Singleton registry
export const modelRegistry = new ModelRegistry();
