/**
 * Unified AI Client for SICA Chatbot
 * 
 * Supports multiple LLM providers with automatic fallback:
 * - Primary: MiniMax (fast, cost-effective)
 * - Fallback: Moonshot/Kimi (higher context window)
 * 
 * Usage:
 *   for await (const chunk of streamAI(messages)) { ... }
 *   const response = await invokeAI(messages);
 */

import OpenAI from 'openai';

// ============================================================================
// Configuration
// ============================================================================

type LLMProvider = 'minimax' | 'moonshot';

interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  name: string;
}

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'minimax') as LLMProvider;

// MiniMax Configuration
const minimaxConfig: ProviderConfig = {
  apiKey: process.env.MINIMAX_API_KEY || '',
  baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
  model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
  name: 'MiniMax',
};

// Moonshot/Kimi Configuration
const moonshotConfig: ProviderConfig = {
  apiKey: process.env.MOONSHOT_API_KEY || '',
  baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
  model: process.env.MOONSHOT_MODEL || 'kimi-k2.5',
  name: 'Moonshot',
};

// ============================================================================
// Client Management
// ============================================================================

let primaryClient: OpenAI | null = null;
let fallbackClient: OpenAI | null = null;

/**
 * Create an OpenAI-compatible client for a provider
 */
function createClient(config: ProviderConfig): OpenAI | null {
  if (!config.apiKey) {
    console.warn(`[AI Client] ${config.name}: No API key configured`);
    return null;
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

/**
 * Get or create the primary client
 */
function getPrimaryClient(): OpenAI | null {
  if (!primaryClient) {
    primaryClient = createClient(LLM_PROVIDER === 'minimax' ? minimaxConfig : moonshotConfig);
  }
  return primaryClient;
}

/**
 * Get or create the fallback client
 */
function getFallbackClient(): OpenAI | null {
  if (!fallbackClient) {
    // Use the opposite provider as fallback
    const config = LLM_PROVIDER === 'minimax' ? moonshotConfig : minimaxConfig;
    fallbackClient = createClient(config);
  }
  return fallbackClient;
}

/**
 * Get the active provider configuration
 */
export function getActiveProvider(): ProviderConfig {
  return LLM_PROVIDER === 'minimax' ? minimaxConfig : moonshotConfig;
}

/**
 * Get the fallback provider configuration
 */
export function getFallbackProvider(): ProviderConfig {
  return LLM_PROVIDER === 'minimax' ? moonshotConfig : minimaxConfig;
}

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// Core AI Functions
// ============================================================================

/**
 * Invoke AI with automatic fallback
 * Tries primary provider first, falls back to secondary on failure
 */
export async function invokeAI(
  messages: ChatMessage[],
  options: AIStreamOptions = {}
): Promise<string> {
  const primary = getPrimaryClient();
  const fallback = getFallbackClient();
  const primaryConfig = getActiveProvider();
  const fallbackConfig = getFallbackProvider();

  const model = options.model || primaryConfig.model;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens;

  // Try primary provider
  if (primary) {
    try {
      console.log(`[AI Client] Using ${primaryConfig.name} (${model})`);
      
      const response = await primary.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error(`[AI Client] ${primaryConfig.name} error:`, error);
      console.log(`[AI Client] Falling back to ${fallbackConfig.name}...`);
    }
  }

  // Fallback to secondary provider
  if (fallback) {
    try {
      const fallbackModel = options.model || fallbackConfig.model;
      console.log(`[AI Client] Using ${fallbackConfig.name} (${fallbackModel})`);

      const response = await fallback.chat.completions.create({
        model: fallbackModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error(`[AI Client] ${fallbackConfig.name} error:`, error);
    }
  }

  throw new Error('All AI providers failed. Please check your API keys.');
}

/**
 * Stream AI response with automatic fallback
 * Yields chunks as they arrive from the API
 */
export async function* streamAI(
  messages: ChatMessage[],
  options: AIStreamOptions = {}
): AsyncGenerator<string> {
  const primary = getPrimaryClient();
  const fallback = getFallbackClient();
  const primaryConfig = getActiveProvider();
  const fallbackConfig = getFallbackProvider();

  const model = options.model || primaryConfig.model;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens;

  // Try primary provider
  if (primary) {
    try {
      console.log(`[AI Client] Streaming with ${primaryConfig.name} (${model})`);

      const stream = await primary.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
      return; // Success - done
    } catch (error) {
      console.error(`[AI Client] ${primaryConfig.name} stream error:`, error);
      console.log(`[AI Client] Falling back to ${fallbackConfig.name}...`);
    }
  }

  // Fallback to secondary provider
  if (fallback) {
    try {
      const fallbackModel = options.model || fallbackConfig.model;
      console.log(`[AI Client] Streaming with ${fallbackConfig.name} (${fallbackModel})`);

      const stream = await fallback.chat.completions.create({
        model: fallbackModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
      return; // Success - done
    } catch (error) {
      console.error(`[AI Client] ${fallbackConfig.name} stream error:`, error);
    }
  }

  throw new Error('All AI providers failed. Please check your API keys.');
}

/**
 * Stream AI with callback function
 */
export async function streamAIWithCallback(
  messages: ChatMessage[],
  callback: (chunk: string) => void,
  options: AIStreamOptions = {}
): Promise<string> {
  let fullResponse = '';

  for await (const chunk of streamAI(messages, options)) {
    fullResponse += chunk;
    callback(chunk);
  }

  return fullResponse;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retry wrapper for AI calls with exponential backoff
 */
export async function invokeAIWithRetry(
  messages: ChatMessage[],
  options: AIStreamOptions = {},
  maxRetries: number = 2
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await invokeAI(messages, options);
    } catch (error) {
      lastError = error as Error;
      console.log(`[AI Client] Attempt ${attempt + 1} failed, retrying...`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const delay = Math.pow(2, attempt) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('AI invocation failed after retries');
}

/**
 * Retry wrapper for streaming AI calls
 */
export async function* streamAIWithRetry(
  messages: ChatMessage[],
  options: AIStreamOptions = {},
  maxRetries: number = 2
): AsyncGenerator<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      for await (const chunk of streamAI(messages, options)) {
        yield chunk;
      }
      return; // Success
    } catch (error) {
      lastError = error as Error;
      console.log(`[AI Client] Stream attempt ${attempt + 1} failed, retrying...`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('AI streaming failed after retries');
}

// ============================================================================
// Exports
// ============================================================================

export default {
  invoke: invokeAI,
  invokeWithRetry: invokeAIWithRetry,
  stream: streamAI,
  streamWithRetry: streamAIWithRetry,
  streamWithCallback: streamAIWithCallback,
  getActiveProvider,
  getFallbackProvider,
};
