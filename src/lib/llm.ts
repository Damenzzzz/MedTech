/**
 * @deprecated Use imports from '@/lib/ai/text-llm.server' directly.
 * This file exists only for backward compatibility during migration.
 * All text LLM calls go through the provider configured by LLM_PROVIDER env.
 * OpenAI and Gemini are NEVER used for text generation.
 */
export { callClinicalJson, callClinicalText, getActiveLlmProvider } from './ai/text-llm.server';
