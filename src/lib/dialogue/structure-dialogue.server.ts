import 'server-only';
import { createHash } from 'node:crypto';
import {
  AssignDialogueRolesLlmOutputSchema,
  DialogueRole,
  RoledTurn,
  StructureDialogueLlmOutputSchema,
  StructureDialogueRequest,
  StructureDialogueRequestSchema,
  StructuredDialogue,
  StructuredDialogueSchema,
  StructuredTurn,
} from '@/domain/schemas';
import { getLlmProvider } from '@/lib/ai/provider-config.server';
import { callClinicalJson } from '@/lib/ai/text-llm.server';

// Server-side memory cache for dialogue idempotency & caching by transcript hash
const dialogueCache = new Map<string, StructuredDialogue>();

export class DialogueStructuringError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DialogueStructuringError';
    this.code = code;
  }
}

export function computeDialogueHash(
  transcriptText: string,
  turns: Array<{ speaker: string; text: string }>,
): string {
  const normalized = `${transcriptText.trim()}::${turns.map((t) => `${t.speaker}:${t.text.trim()}`).join('|')}`;
  return createHash('sha256').update(normalized).digest('hex');
}

export async function generateStructuredDialogue(
  rawInput: unknown,
): Promise<{ dialogue: StructuredDialogue; cacheHit: boolean }> {
  const input = StructureDialogueRequestSchema.parse(rawInput);
  const hash = computeDialogueHash(input.transcriptText, input.turns);

  if (!input.regenerate && dialogueCache.has(hash)) {
    const cached = dialogueCache.get(hash)!;
    return { dialogue: cached, cacheHit: true };
  }

  const provider = getLlmProvider();

  // Prompt A: structure the raw transcript into ordered turns (no roles yet).
  const structuredTurns = await runStructureDialoguePrompt(input, provider);

  // Prompt B: assign doctor/patient roles to the already-structured turns.
  const roledTurns = await runAssignRolesPrompt(structuredTurns, input.locale, provider);

  const now = new Date().toISOString();
  const dialogueId = `dlg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const currentVersion = input.regenerate && dialogueCache.has(hash)
    ? (dialogueCache.get(hash)!.version ?? 1) + 1
    : 1;

  const previousHistory = input.regenerate && dialogueCache.has(hash)
    ? dialogueCache.get(hash)!.history || []
    : [];

  const newHistoryEntry = {
    version: currentVersion,
    createdAt: now,
    source: 'ai' as const,
  };

  const rawDialogue = {
    dialogueId,
    transcriptId: input.transcriptId,
    status: 'draft',
    locale: input.locale,
    turns: roledTurns,
    provenance: {
      generationProvider: provider,
      structureModel: provider === 'alem' ? (process.env.ALEM_CHAT_MODEL ?? 'alemllm') : 'mock',
      roleAssignmentModel: provider === 'alem' ? (process.env.ALEM_CHAT_MODEL ?? 'alemllm') : 'mock',
      generatedAt: now,
    },
    version: currentVersion,
    history: [...previousHistory, newHistoryEntry],
  };

  const dialogue = StructuredDialogueSchema.parse(rawDialogue);
  dialogueCache.set(hash, dialogue);

  return { dialogue, cacheHit: false };
}

// --- Prompt A: structure the raw transcript into ordered turns ---

function buildStructurePromptSystem(): string {
  return `Ты медицинский ассистент, который приводит сырую расшифровку разговора врача и пациента в аккуратный, последовательный список реплик.

СТРОГИЕ ПРАВИЛА:
1. Категорически ЗАПРЕЩЕНО придумывать новые факты, реплики или высказывания, которых нет в исходном тексте.
2. Разрешено ИСПРАВЛЯТЬ только очевидные ошибки распознавания медицинских терминов (например, неверно расслышанное название препарата или симптома), опираясь на контекст фразы. Смысл менять нельзя.
3. НЕ определяй роль спикера (врач/пациент) — это делается на следующем шаге. Просто перенеси метку спикера (speaker_label) как есть из исходных данных.
4. Сохраняй исходный порядок реплик и таймкоды (start_time), если они были переданы.
5. Верни СТРОГО валидный JSON вида:
{"turns": [{"turn_index": 0, "speaker_label": "...", "text": "...", "start_time": 0.0}]}`;
}

function buildStructurePromptUser(input: StructureDialogueRequest): string {
  const turnsBlock = input.turns.length
    ? input.turns
        .map((t, i) => `${i}. [${t.speaker}]${typeof t.start === 'number' ? ` (${t.start}s)` : ''}: ${t.text}`)
        .join('\n')
    : '(метки спикеров и таймкоды отсутствуют)';

  return `Сырой транскрипт разговора:\n${input.transcriptText}\n\nИсходное разбиение по спикерам/таймкодам (может быть неточным):\n${turnsBlock}\n\nСформируй JSON со структурированными репликами по порядку.`;
}

async function runStructureDialoguePrompt(
  input: StructureDialogueRequest,
  provider: string,
): Promise<StructuredTurn[]> {
  if (provider === 'mock') {
    return mockStructureTurns(input);
  }

  const raw = await callClinicalJson<{ turns?: unknown }>(buildStructurePromptUser(input), {
    system: buildStructurePromptSystem(),
    maxTokens: 2000,
    timeoutMs: 30000,
  });

  if (!raw) {
    throw new DialogueStructuringError(
      'DIALOGUE_STRUCTURE_LLM_EMPTY_RESPONSE',
      'LLM не вернул ответ при структурировании диалога (промпт A).',
    );
  }

  const parsed = StructureDialogueLlmOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DialogueStructuringError(
      'DIALOGUE_STRUCTURE_LLM_INVALID_JSON',
      `LLM вернул JSON, не соответствующий схеме структурирования диалога (промпт A): ${parsed.error.message}`,
    );
  }

  return parsed.data.turns;
}

function mockStructureTurns(input: StructureDialogueRequest): StructuredTurn[] {
  if (input.turns.length) {
    return input.turns.map((t, i) => ({
      turn_index: i,
      speaker_label: t.speaker,
      text: t.text,
      start_time: t.start,
    }));
  }

  const text = input.transcriptText.trim();
  if (!text) return [];
  return [{ turn_index: 0, speaker_label: 'unknown', text, start_time: undefined }];
}

// --- Prompt B: assign doctor/patient roles to the structured turns ---

function buildRolePromptSystem(): string {
  return `Ты медицинский ассистент. На вход подан уже структурированный по репликам диалог врача и пациента (без ролей).

Задача: для каждой реплики определить role: "doctor" или "patient", опираясь на контекст (кто спрашивает про симптомы/анамнез/жалобы — обычно врач, кто отвечает от первого лица о своём состоянии — обычно пациент).

СТРОГИЕ ПРАВИЛА:
1. Один и тот же speaker_label должен соответствовать ОДНОЙ роли на протяжении всего диалога — сохраняй консистентность.
2. Если по смыслу середина диалога явно противоречит ранее присвоенной роли для этого speaker_label (например, метки спикеров перепутаны в источнике), скорректируй роль, ориентируясь на смысл реплики, а не на исходную метку.
3. НЕ меняй текст реплик, их порядок, turn_index, speaker_label или start_time — только добавь поле role.
4. Верни СТРОГО валидный JSON вида:
{"turns": [{"turn_index": 0, "speaker_label": "...", "text": "...", "start_time": 0.0, "role": "doctor"}]}`;
}

function buildRolePromptUser(turns: StructuredTurn[]): string {
  return `Структурированный диалог (результат предыдущего шага):\n${JSON.stringify({ turns })}\n\nОпредели role для каждой реплики и верни JSON в указанном формате.`;
}

async function runAssignRolesPrompt(
  turns: StructuredTurn[],
  _locale: string,
  provider: string,
): Promise<RoledTurn[]> {
  if (!turns.length) return [];

  if (provider === 'mock') {
    return mockAssignRoles(turns);
  }

  const raw = await callClinicalJson<{ turns?: unknown }>(buildRolePromptUser(turns), {
    system: buildRolePromptSystem(),
    maxTokens: 2000,
    timeoutMs: 30000,
  });

  if (!raw) {
    throw new DialogueStructuringError(
      'DIALOGUE_ROLES_LLM_EMPTY_RESPONSE',
      'LLM не вернул ответ при определении ролей спикеров (промпт B).',
    );
  }

  const parsed = AssignDialogueRolesLlmOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DialogueStructuringError(
      'DIALOGUE_ROLES_LLM_INVALID_JSON',
      `LLM вернул JSON, не соответствующий схеме определения ролей (промпт B): ${parsed.error.message}`,
    );
  }

  return parsed.data.turns;
}

function mockAssignRoles(turns: StructuredTurn[]): RoledTurn[] {
  const knownLabelRoles = new Map<string, DialogueRole>();
  let nextFallbackRole: DialogueRole = 'doctor';

  return turns.map((turn) => {
    const label = turn.speaker_label.toLowerCase();
    let role: DialogueRole;

    if (label.includes('doctor') || label.includes('врач')) {
      role = 'doctor';
    } else if (label.includes('patient') || label.includes('пациент')) {
      role = 'patient';
    } else if (knownLabelRoles.has(turn.speaker_label)) {
      role = knownLabelRoles.get(turn.speaker_label)!;
    } else {
      role = nextFallbackRole;
      nextFallbackRole = nextFallbackRole === 'doctor' ? 'patient' : 'doctor';
    }

    knownLabelRoles.set(turn.speaker_label, role);
    return { ...turn, role };
  });
}
