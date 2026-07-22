import 'server-only';
import { createHash } from 'node:crypto';
import {
  EncounterProtocol,
  EncounterProtocolRequest,
  EncounterProtocolRequestSchema,
  EncounterProtocolSchema,
} from '@/domain/schemas';
import { getLlmProvider, getSttConfig } from '@/lib/ai/provider-config.server';
import { callClinicalJson } from '@/lib/ai/text-llm.server';

// Server-side memory cache for protocol idempotency & caching by transcript hash
const protocolCache = new Map<string, EncounterProtocol>();

export function computeTranscriptHash(transcriptText: string, turns: Array<{ speaker: string; text: string }>): string {
  const normalized = `${transcriptText.trim()}::${turns.map((t) => `${t.speaker}:${t.text.trim()}`).join('|')}`;
  return createHash('sha256').update(normalized).digest('hex');
}

export async function generateEncounterProtocol(rawInput: unknown): Promise<{ protocol: EncounterProtocol; cacheHit: boolean }> {
  const input = EncounterProtocolRequestSchema.parse(rawInput);
  const hash = computeTranscriptHash(input.transcriptText, input.turns);

  // Check cache unless explicitly requesting regeneration
  if (!input.regenerate && protocolCache.has(hash)) {
    const cached = protocolCache.get(hash)!;
    return { protocol: cached, cacheHit: true };
  }

  const provider = getLlmProvider();
  const sttConfig = getSttConfig();
  const sttModel = sttConfig?.model ?? 'gpt-4o-transcribe-diarize';

  let generatedSections: Record<string, unknown> | null = null;

  if (provider === 'alem') {
    generatedSections = await callAlemForProtocol(input);
  }

  // Fallback / Mock generator
  if (!generatedSections) {
    generatedSections = buildMockProtocolSections(input);
  }

  const now = new Date().toISOString();
  const protocolId = `prot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const currentVersion = input.regenerate && protocolCache.has(hash)
    ? (protocolCache.get(hash)!.version ?? 1) + 1
    : 1;

  const previousHistory = input.regenerate && protocolCache.has(hash)
    ? protocolCache.get(hash)!.history || []
    : [];

  const newHistoryEntry = {
    version: currentVersion,
    createdAt: now,
    source: 'ai' as const,
  };

  const rawProtocol = {
    protocolId,
    status: 'draft',
    locale: input.locale,
    sections: generatedSections,
    provenance: {
      transcriptionProvider: 'openai',
      transcriptionModel: sttModel,
      generationProvider: provider,
      generationModel: provider === 'alem' ? (process.env.ALEM_CHAT_MODEL ?? 'alemllm') : 'mock',
      generatedAt: now,
    },
    warning: 'Черновик создан AI и требует проверки и утверждения врачом.',
    version: currentVersion,
    history: [...previousHistory, newHistoryEntry],
  };

  const protocol = EncounterProtocolSchema.parse(rawProtocol);

  // Store in server cache
  protocolCache.set(hash, protocol);

  return { protocol, cacheHit: false };
}

async function callAlemForProtocol(input: EncounterProtocolRequest): Promise<Record<string, unknown> | null> {
  const turnsText = input.turns.map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`).join('\n');
  // The role-labelled turns are the authoritative view of who said what, so they
  // are always included — a raw transcript alone would strip that attribution and
  // let the model mix up doctor statements with patient-reported symptoms.
  const fullContent = input.transcriptText && turnsText
    ? `${input.transcriptText}\n\nРазмеченные по ролям реплики:\n${turnsText}`
    : input.transcriptText || turnsText;

  const systemPrompt = `Ты профессиональный клинический AI-ассистент врача. Твоя задача — сформировать структурированный черновик протокола амбулаторного/клинического приёма строго на основе транскрипта разговора.

СТРОГИЕ ПРАВИЛА БЕЗОПАСНОСТИ:
1. Категорически ЗАПРЕЩЕНО придумывать или домышлять симптомы, анамнез, препараты, аллергии, показатели или осмотр, которых нет в транскрипте.
2. Все факты в разделах chiefComplaints, historyOfPresentIllness, pastMedicalHistory, medications, allergies, objectiveFindings, vitalSigns, redFlags ДОЛЖНЫ иметь точные цитаты ("sourceQuotes") из текста транскрипта.
2a. Жалобы и анамнез («со слов пациента») бери ТОЛЬКО из реплик с меткой [PATIENT]. Реплики [DOCTOR] — это вопросы и назначения врача, они не являются жалобами пациента.
3. Вся отсутствующая, но важная клиническая информация должна попадать в раздел "unresolvedQuestions".
4. Раздел "plan" является только предложенным черновиком рекомендаций врача.
5. Отвечай СТРОГО на русском языке в формате JSON.

Верни JSON следующей структуры:
{
  "chiefComplaints": [{"text": "...", "sourceQuotes": ["..."]}],
  "historyOfPresentIllness": {"text": "...", "sourceQuotes": ["..."]},
  "pastMedicalHistory": [{"text": "...", "sourceQuotes": ["..."]}],
  "medications": [{"text": "...", "sourceQuotes": ["..."]}],
  "allergies": [{"text": "...", "sourceQuotes": ["..."]}],
  "objectiveFindings": [{"text": "...", "sourceQuotes": ["..."]}],
  "vitalSigns": [{"name": "Температура", "value": "38.0 °C", "sourceQuote": "..."}],
  "redFlags": [{"text": "...", "sourceQuotes": ["..."]}],
  "assessment": {
    "clinicalSummary": "...",
    "preliminaryDiagnosis": {
      "diagnosis": "...",
      "icd10Code": "...",
      "sourceQuotes": ["..."],
      "uncertainties": ["..."]
    },
    "differentialDiagnoses": [
      {
        "diagnosis": "...",
        "icd10Code": "...",
        "supportingEvidence": ["..."],
        "missingEvidence": ["..."]
      }
    ]
  },
  "plan": {
    "investigations": ["..."],
    "treatmentDraft": ["..."],
    "referrals": ["..."],
    "followUp": ["..."],
    "safetyNetting": ["..."]
  },
  "unresolvedQuestions": ["..."]
}`;

  const userPrompt = `Транскрипт приёма:\n${fullContent}\n\nСформируй структурированный JSON черновика протокола.`;

  return await callClinicalJson<Record<string, unknown>>(userPrompt, {
    system: systemPrompt,
    maxTokens: 2500,
    timeoutMs: 45000,
  });
}

function buildMockProtocolSections(input: EncounterProtocolRequest): Record<string, unknown> {
  const text = input.transcriptText.toLowerCase();

  const chiefComplaints: Array<{ text: string; sourceQuotes: string[] }> = [];
  const sourceQuotes: string[] = [];

  for (const turn of input.turns) {
    if (turn.speaker === 'patient' && turn.text) {
      sourceQuotes.push(turn.text);
    }
  }

  if (text.includes('головная боль') || text.includes('болит голова')) {
    chiefComplaints.push({
      text: 'Жалобы на головную боль',
      sourceQuotes: sourceQuotes.filter((q) => q.toLowerCase().includes('головная боль') || q.toLowerCase().includes('болит голова')),
    });
  }
  if (text.includes('температура') || text.includes('38')) {
    chiefComplaints.push({
      text: 'Повышение температуры тела до 38.0 °C',
      sourceQuotes: sourceQuotes.filter((q) => q.toLowerCase().includes('температура') || q.includes('38')),
    });
  }

  if (!chiefComplaints.length && sourceQuotes.length > 0) {
    chiefComplaints.push({
      text: sourceQuotes[0],
      sourceQuotes: [sourceQuotes[0]],
    });
  }

  const hpiText = sourceQuotes.length > 0
    ? `Со слов пациента: ${sourceQuotes.join(' ')}`
    : 'Симптомы беспокоят в течение нескольких дней.';

  const isHypertension = text.includes('давление') || text.includes('гипертон');
  const isUri = text.includes('температура') || text.includes('кашель') || text.includes('горло');

  return {
    chiefComplaints,
    historyOfPresentIllness: {
      text: hpiText,
      sourceQuotes: sourceQuotes.slice(0, 2),
    },
    pastMedicalHistory: [],
    medications: text.includes('парацетамол')
      ? [{ text: 'Парацетамол 500 мг', sourceQuotes: sourceQuotes.filter((q) => q.toLowerCase().includes('парацетамол')) }]
      : [],
    allergies: [],
    objectiveFindings: [],
    vitalSigns: text.includes('38')
      ? [{ name: 'Температура тела', value: '38.0 °C', sourceQuote: 'температура 38' }]
      : [],
    redFlags: [],
    assessment: {
      clinicalSummary: 'Симптомы острой вирусной инфекции или первичного обращения.',
      preliminaryDiagnosis: {
        diagnosis: isUri ? 'Острая вирусная инфекция верхних дыхательных путей' : isHypertension ? 'Артериальная гипертензия' : 'Неуточнённое состояние',
        icd10Code: isUri ? 'J06.9' : isHypertension ? 'I10' : 'R69',
        sourceQuotes: sourceQuotes.slice(0, 1),
        uncertainties: ['Необходима термометрия и осмотр зева.'],
      },
      differentialDiagnoses: isUri
        ? [
            {
              diagnosis: 'Внебольничная пневмония',
              icd10Code: 'J18.9',
              supportingEvidence: ['Лихорадка'],
              missingEvidence: ['Аускультация лёгких', 'Рентгенография ГК'],
            },
          ]
        : [],
    },
    plan: {
      investigations: ['Общий анализ крови', 'Осмотр зева'],
      treatmentDraft: ['Симптоматическая терапия', 'Обильное питьё'],
      referrals: [],
      followUp: ['Повторный осмотр через 3 дня при сохранении лихорадки'],
      safetyNetting: ['Обратиться в скорую помощь при появлении одышки или боли в груди'],
    },
    unresolvedQuestions: [
      'Уточнить наличие аллергических реакций в анамнезе.',
      'Уточнить сопутствующие хронические заболевания.',
    ],
  };
}
