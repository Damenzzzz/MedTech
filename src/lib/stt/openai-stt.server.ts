import 'server-only';
import { getSttProvider } from '@/lib/ai/provider-config.server';
import {
  SttResponse,
  SttResponseSchema,
  SttTurn,
} from '@/domain/schemas';

export interface SttOptions {
  language?: string;
}

const SUPPORTED_EXTENSIONS = ['.webm', '.wav', '.mp3', '.mp4', '.m4a', '.ogg'];
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'application/ogg',
  'video/webm',
  'video/mp4',
];

export function getSttEnvConfig() {
  const provider = getSttProvider();
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const apiKey = process.env.OPENAI_API_KEY;
  const diarization = process.env.OPENAI_STT_DIARIZATION !== 'false';
  const defaultModel = diarization ? 'gpt-4o-transcribe-diarize' : 'gpt-4o-mini-transcribe';
  const model = process.env.OPENAI_STT_MODEL ?? defaultModel;
  const language = process.env.OPENAI_STT_LANGUAGE ?? 'ru';
  const timeoutMs = parseInt(process.env.OPENAI_STT_TIMEOUT_MS ?? '60000', 10);
  const maxRetries = parseInt(process.env.OPENAI_STT_MAX_RETRIES ?? '2', 10);
  const maxAudioMb = parseInt(process.env.STT_MAX_AUDIO_MB ?? '25', 10);
  const maxDurationSeconds = parseInt(process.env.STT_MAX_DURATION_SECONDS ?? '600', 10);

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    diarization,
    language,
    timeoutMs,
    maxRetries,
    maxAudioMb,
    maxDurationSeconds,
  };
}

export function validateAudioFile(file: File): { valid: true } | { valid: false; status: number; error: string; code: string } {
  if (!file || typeof file !== 'object' || typeof (file as { size?: unknown }).size !== 'number' || typeof (file as { name?: unknown }).name !== 'string') {
    return { valid: false, status: 400, error: 'Файл аудио не передан.', code: 'AUDIO_MISSING' };
  }

  const env = getSttEnvConfig();
  const maxBytes = env.maxAudioMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      status: 413,
      error: `Размер аудиофайла (${(file.size / (1024 * 1024)).toFixed(1)} МБ) превышает лимит ${env.maxAudioMb} МБ.`,
      code: 'PAYLOAD_TOO_LARGE',
    };
  }

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  const hasSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasSupportedMime = SUPPORTED_MIME_TYPES.some((m) => mime.includes(m));

  if (!hasSupportedExt && !hasSupportedMime && file.size > 0) {
    return {
      valid: false,
      status: 415,
      error: `Неподдерживаемый формат аудио: "${file.type || file.name}". Поддерживаются: webm, wav, mp3, mp4, m4a, ogg.`,
      code: 'UNSUPPORTED_MEDIA_TYPE',
    };
  }

  return { valid: true };
}

export async function transcribeAudio(audio: File, options?: SttOptions): Promise<SttResponse> {
  const requestId = `stt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const env = getSttEnvConfig();

  // Handle Mock Provider
  if (env.provider === 'mock') {
    return mockSttResponse(requestId);
  }

  if (!env.apiKey) {
    throw new Error('CONFIG_ERROR: OPENAI_API_KEY is not configured for STT_PROVIDER=openai');
  }

  const validation = validateAudioFile(audio);
  if (!validation.valid) {
    const err = new Error(validation.error);
    (err as unknown as { status: number; code: string }).status = validation.status;
    (err as unknown as { status: number; code: string }).code = validation.code;
    throw err;
  }

  const targetLang = options?.language ?? env.language;
  let attemptResult: { ok: true; data: Record<string, unknown> } | { ok: false; error: string; status: number } | null = null;

  for (let attempt = 0; attempt <= env.maxRetries; attempt++) {
    const start = Date.now();
    try {
      attemptResult = await executeOpenAiSttCall(env, audio, targetLang);
      const latency = Date.now() - start;
      if (attemptResult.ok) {
        console.info('[openai-stt]', { requestId, status: 200, latency, provider: 'openai', model: env.model });
        break;
      }
      console.error('[openai-stt]', { requestId, status: attemptResult.status, latency, attempt, error: attemptResult.error });
      if (attempt < env.maxRetries && attemptResult.status >= 500) {
        continue;
      }
      break;
    } catch (err) {
      const latency = Date.now() - start;
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      console.error('[openai-stt]', { requestId, latency, attempt, error: isTimeout ? 'timeout' : 'network_error' });
      if (attempt < env.maxRetries) continue;
      throw new Error(isTimeout ? 'Превышено время ожидания ответа от STT сервиса.' : 'Ошибка соединения с STT сервисом.');
    }
  }

  if (!attemptResult || !attemptResult.ok) {
    throw new Error(attemptResult?.error || 'Транскрибация завершилась с ошибкой.');
  }

  const raw = attemptResult.data;
  const turns = normalizeDiarizedTurns(raw, env.diarization);
  const fullText = String(raw.text ?? turns.map((t) => t.text).join(' ')).trim();
  const detectedLang = mapLanguageCode(targetLang);

  return SttResponseSchema.parse({
    transcriptId: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: fullText || 'Текст не распознан.',
    turns,
    language: detectedLang,
    durationSeconds: typeof raw.duration === 'number' ? raw.duration : 0,
    provider: 'openai',
    model: env.model,
    requestId,
  });
}

async function executeOpenAiSttCall(
  env: ReturnType<typeof getSttEnvConfig>,
  audio: File,
  language: string,
) {
  const form = new FormData();
  const sanitizedName = (audio.name || 'audio.webm').replace(/[^a-zA-Z0-9_.-]/g, '_');
  form.append('file', audio, sanitizedName);

  if (env.diarization) {
    form.append('model', env.model);
    form.append('response_format', 'diarized_json');
    form.append('chunking_strategy', 'auto');
  } else {
    form.append('model', env.model);
    form.append('response_format', 'json');
  }

  if (language && language !== 'auto') {
    form.append('language', language);
  }

  const url = `${env.baseUrl}/audio/transcriptions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.apiKey}` },
    body: form,
    cache: 'no-store',
    signal: AbortSignal.timeout(env.timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'STT Request Failed');
    return { ok: false as const, error: `OpenAI STT error ${response.status}: ${errorText.slice(0, 150)}`, status: response.status };
  }

  const data = (await response.json()) as Record<string, unknown>;
  return { ok: true as const, data };
}

function normalizeDiarizedTurns(raw: Record<string, unknown>, diarizationEnabled: boolean): SttTurn[] {
  const segments = (raw.segments ?? raw.words ?? []) as Array<Record<string, unknown>>;
  if (!Array.isArray(segments) || !segments.length) {
    const text = String(raw.text ?? '').trim();
    if (!text) return [];
    return [
      {
        speaker: 'unknown',
        text,
      },
    ];
  }

  const turns: SttTurn[] = [];
  for (const item of segments) {
    const text = String(item.text ?? item.word ?? '').trim();
    if (!text) continue;
    const rawSpeaker = String(item.speaker ?? item.speaker_id ?? 'unknown');
    turns.push({
      // Diarization answers "who spoke when", not "who is the doctor". Roles stay
      // 'unknown' here and are assigned downstream by the LLM (Prompt B).
      speaker: 'unknown',
      speakerLabel: diarizationEnabled ? normalizeSpeakerLabel(rawSpeaker) : undefined,
      text,
      start: typeof item.start === 'number' ? item.start : undefined,
      end: typeof item.end === 'number' ? item.end : undefined,
    });
  }
  return turns;
}

/**
 * Normalizes a provider diarization label into a stable, comparable key
 * ("Speaker 0" -> "speaker_0"). Deliberately does NOT interpret the label:
 * mapping speaker_0 -> doctor was a biased guess and has been removed.
 */
export function normalizeSpeakerLabel(val: string): string {
  const normalized = val.trim().toLowerCase().replace(/\s+/g, '_');
  return normalized || 'unknown';
}

function mapLanguageCode(lang: string): 'ru' | 'kk' | 'en' | 'unknown' {
  const lower = lang.toLowerCase();
  if (lower === 'ru' || lower === 'russian') return 'ru';
  if (lower === 'kk' || lower === 'kazakh') return 'kk';
  if (lower === 'en' || lower === 'english') return 'en';
  return 'unknown';
}

function mockSttResponse(requestId: string): SttResponse {
  return {
    transcriptId: `tr-mock-${Date.now()}`,
    text: 'Здравствуйте, доктор. У меня три дня болит голова и температура 38. Принимал парацетамол, но не помогает.',
    // Mirrors real STT output: speakers are separated, roles are left unassigned.
    turns: [
      { speaker: 'unknown', speakerLabel: 'speaker_0', text: 'Здравствуйте, доктор. У меня три дня болит голова и температура 38.', start: 0, end: 4.5 },
      { speaker: 'unknown', speakerLabel: 'speaker_1', text: 'Здравствуйте! Какую дозировку парацетамола принимали?', start: 4.8, end: 7.2 },
      { speaker: 'unknown', speakerLabel: 'speaker_0', text: 'Принимал по 1 таблетке 500 миллиграмм, но боль не уходит.', start: 7.5, end: 11.0 },
    ],
    language: 'ru',
    durationSeconds: 11,
    provider: 'mock',
    model: 'mock-stt',
    requestId,
  };
}
