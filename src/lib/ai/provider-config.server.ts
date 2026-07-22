import 'server-only';
import { z } from 'zod';

const LlmProviderSchema = z.enum(['alem', 'mock']);
const SttProviderSchema = z.enum(['openai', 'mock']);

export type LlmProvider = z.infer<typeof LlmProviderSchema>;
export type SttProvider = z.infer<typeof SttProviderSchema>;

let warnedLlmProviderMissing = false;
let warnedSttProviderMissing = false;

export function getLlmProvider(): LlmProvider {
  if (process.env.LLM_PROVIDER === undefined) {
    if (process.env.NODE_ENV !== 'test' && !warnedLlmProviderMissing) {
      warnedLlmProviderMissing = true;
      console.warn(
        '[provider-config] LLM_PROVIDER не задан — используется mock, реальные ответы LLM генерироваться не будут. Добавь LLM_PROVIDER=alem в .env.local',
      );
    }
    return 'mock';
  }
  return LlmProviderSchema.parse(process.env.LLM_PROVIDER);
}

export function getSttProvider(): SttProvider {
  if (process.env.STT_PROVIDER === undefined) {
    if (process.env.NODE_ENV !== 'test' && !warnedSttProviderMissing) {
      warnedSttProviderMissing = true;
      console.warn(
        '[provider-config] STT_PROVIDER не задан — используется mock, реальная транскрибация выполняться не будет. Добавь STT_PROVIDER=openai в .env.local',
      );
    }
    return 'mock';
  }
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
 * Image generation (OPENAI_IMAGE_API_KEY / gpt-image-2) is intentionally absent
 * from this module. It exists only in scripts/generate-patient-assets.ts and runs
 * offline against `POST /v1/images/generations`; exposing it here would make it
 * reachable at runtime, which is exactly what the isolation policy forbids.
 */

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
