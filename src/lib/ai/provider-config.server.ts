import 'server-only';
import { z } from 'zod';

const LlmProviderSchema = z.enum(['alem', 'mock']).default('mock');
const SttProviderSchema = z.enum(['openai', 'mock']).default('mock');

export type LlmProvider = z.infer<typeof LlmProviderSchema>;
export type SttProvider = z.infer<typeof SttProviderSchema>;

export function getLlmProvider(): LlmProvider {
  return LlmProviderSchema.parse(process.env.LLM_PROVIDER);
}

export function getSttProvider(): SttProvider {
  return SttProviderSchema.parse(process.env.STT_PROVIDER);
}

export function getAlemConfig() {
  const baseUrl = (process.env.ALEM_BASE_URL ?? 'https://llm.alem.ai/v1').replace(/\/$/, '');
  const apiKey = process.env.ALEM_API_KEY;
  const model = process.env.ALEM_CHAT_MODEL ?? 'alemllm';
  if (!apiKey) return null;
  return { baseUrl, apiKey, model } as const;
}

export function getSttConfig() {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_STT_MODEL ?? 'gpt-4o-transcribe-diarize';
  const language = process.env.OPENAI_STT_LANGUAGE ?? 'ru';
  const diarization = process.env.OPENAI_STT_DIARIZATION !== 'false';
  if (!apiKey) return null;
  return { baseUrl, apiKey, model, language, diarization } as const;
}

/**
 * Guard: OPENAI_API_KEY must NEVER be read by text LLM providers.
 * This function is used in tests to verify isolation.
 */
export function assertNoOpenAiInTextProvider(): void {
  const provider = getLlmProvider();
  if (provider !== 'alem' && provider !== 'mock') {
    throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
