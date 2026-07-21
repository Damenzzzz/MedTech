import 'server-only';
import { getLlmProvider } from './provider-config.server';
import { alemCallJson, alemCallText } from './alem-llm.server';
import { mockCallJson, mockCallText } from './mock-llm.server';

type JsonValue = Record<string, unknown>;
type CallOptions = {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
};

/**
 * Call the configured text LLM to get a JSON response.
 * Provider is determined solely by LLM_PROVIDER env var.
 * NEVER calls OpenAI, Gemini, or any other provider.
 */
export async function callClinicalJson<T extends JsonValue>(
  prompt: string,
  options?: CallOptions,
): Promise<T | null> {
  const provider = getLlmProvider();
  switch (provider) {
    case 'alem':
      return alemCallJson<T>(prompt, options);
    case 'mock':
      return mockCallJson<T>(prompt, options);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM_PROVIDER: ${_exhaustive}`);
    }
  }
}

/**
 * Call the configured text LLM to get a plain text response.
 * Provider is determined solely by LLM_PROVIDER env var.
 * NEVER calls OpenAI, Gemini, or any other provider.
 */
export async function callClinicalText(
  prompt: string,
  options?: CallOptions,
): Promise<string | null> {
  const provider = getLlmProvider();
  switch (provider) {
    case 'alem':
      return alemCallText(prompt, options);
    case 'mock':
      return mockCallText(prompt, options);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM_PROVIDER: ${_exhaustive}`);
    }
  }
}

/**
 * Get the active LLM provider name for response metadata.
 */
export function getActiveLlmProvider(): string {
  return getLlmProvider();
}
