import 'server-only';
import { getAlemConfig } from './provider-config.server';

const MAX_RETRIES = 2;

type CallOptions = {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
};

type JsonValue = Record<string, unknown>;

const RUSSIAN_JSON_RULE = 'Верни только валидный JSON. JSON-ключи оставь строго как запрошено, но все текстовые значения внутри JSON пиши строго на русском языке.';
const RUSSIAN_TEXT_RULE = 'Отвечай строго на русском языке. Все человекочитаемые фразы, объяснения, вопросы, предупреждения и значения строк должны быть на русском. Не используй английский язык, кроме технических кодов, названий API, JSON-ключей, МКБ/ICD-кодов и общепринятых медицинских сокращений.';

function buildSystem(system: string | undefined, json: boolean): string {
  const rule = json
    ? `${RUSSIAN_JSON_RULE}\n${RUSSIAN_TEXT_RULE}`
    : `Отвечай только на русском языке.\n${RUSSIAN_TEXT_RULE}`;
  return system ? `${rule}\n\n${system}`.trim() : rule;
}

function appendRussianInstruction(prompt: string, json: boolean): string {
  const instruction = json
    ? 'Важно: ответ должен быть строго валидным JSON; все текстовые значения внутри JSON должны быть на русском языке.'
    : 'Важно: ответ должен быть полностью на русском языке.';
  return `${prompt}\n\n${instruction}`;
}

async function callAlemRaw(prompt: string, options: CallOptions & { json: boolean }): Promise<string | null> {
  const config = getAlemConfig();
  if (!config) return null;

  const { baseUrl, apiKey, model } = config;
  const system = buildSystem(options.system, options.json);
  const userContent = appendRussianInstruction(prompt, options.json);
  const timeoutMs = options.timeoutMs ?? 30000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const requestId = `alem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent },
          ],
          temperature: options.temperature ?? (options.json ? 0.1 : 0.2),
          max_tokens: options.maxTokens ?? 1600,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });

      const latency = Date.now() - start;

      if (!response.ok) {
        console.error('[alem-llm]', { requestId, status: response.status, latency, attempt, provider: 'alem', model, error: 'http_error' });
        if (attempt < MAX_RETRIES && response.status >= 500) continue;
        return null;
      }

      const data = await response.json();
      const content = String(data.choices?.[0]?.message?.content ?? '').trim();
      console.info('[alem-llm]', { requestId, status: 200, latency, provider: 'alem', model });
      return content || null;
    } catch (error) {
      const latency = Date.now() - start;
      const category = error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network';
      console.error('[alem-llm]', { requestId, latency, attempt, provider: 'alem', model, error: category });
      if (attempt < MAX_RETRIES) continue;
      return null;
    }
  }
  return null;
}

export async function alemCallJson<T extends JsonValue>(prompt: string, options?: CallOptions): Promise<T | null> {
  const raw = await callAlemRaw(prompt, { ...options, json: true });
  if (!raw) return null;
  return parseJsonObject<T>(raw);
}

export async function alemCallText(prompt: string, options?: CallOptions): Promise<string | null> {
  return callAlemRaw(prompt, { ...options, json: false });
}

function parseJsonObject<T>(content: string): T | null {
  const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const direct = tryParse<T>(cleaned);
  if (direct) return direct;
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return tryParse<T>(cleaned.slice(start, end + 1));
  return null;
}

function tryParse<T>(value: string): T | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}
