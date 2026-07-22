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

/** Diarization label if present, otherwise the coarse speaker field. */
function sourceLabel(turn: { speaker: string; speakerLabel?: string }): string {
  return turn.speakerLabel?.trim() || turn.speaker;
}

function buildStructurePromptUser(input: StructureDialogueRequest): string {
  const turnsBlock = input.turns.length
    ? input.turns
        .map((t, i) => `${i}. [${sourceLabel(t)}]${typeof t.start === 'number' ? ` (${t.start}s)` : ''}: ${t.text}`)
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
      speaker_label: sourceLabel(t),
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

Задача: для каждой реплики определить role: "doctor" или "patient", опираясь ИСКЛЮЧИТЕЛЬНО на смысл всего диалога.

КАК ОТЛИЧИТЬ РОЛИ ПО СМЫСЛУ:
- Врач: задаёт вопросы о жалобах, анамнезе, длительности и характере симптомов; обращается на «вы» («что вас беспокоит», «как давно», «принимали ли»); назначает обследования и лечение; объясняет диагноз.
- Пациент: описывает своё состояние от первого лица («у меня болит», «чувствую», «принимал»); отвечает на вопросы; обращается к собеседнику «доктор».

СТРОГИЕ ПРАВИЛА:
1. Метка speaker_label — это ТОЛЬКО результат диаризации («кто говорил»), она НЕ несёт информации о роли. Порядковый номер метки (speaker_0, speaker_1) НИЧЕГО не значит: speaker_0 — не обязательно врач. Никогда не выводи роль из номера метки.
2. Один и тот же speaker_label должен соответствовать ОДНОЙ роли на протяжении всего диалога — сохраняй консистентность. Определи роль каждой метки по совокупности ВСЕХ её реплик, а не по одной.
3. Если исходные метки перепутаны или смысл противоречит первому впечатлению, ориентируйся на смысл реплик, а не на метку.
4. Первым может говорить как врач, так и пациент — не предполагай очередность заранее.
5. НЕ меняй текст реплик, их порядок, turn_index, speaker_label или start_time — только добавь поле role.
6. Верни СТРОГО валидный JSON вида:
{"turns": [{"turn_index": 0, "speaker_label": "...", "text": "...", "start_time": 0.0, "role": "doctor"}]}

ПРИМЕР (метки в источнике перепутаны — роль определяется по смыслу):
Вход:
{"turns": [
  {"turn_index": 0, "speaker_label": "speaker_0", "text": "Здравствуйте, доктор. У меня третий день болит горло."},
  {"turn_index": 1, "speaker_label": "speaker_1", "text": "Здравствуйте. Температуру измеряли?"},
  {"turn_index": 2, "speaker_label": "speaker_0", "text": "Да, вчера было 37.8."},
  {"turn_index": 3, "speaker_label": "speaker_1", "text": "Хорошо, давайте посмотрим горло и сдадим общий анализ крови."}
]}
Правильный выход (speaker_0 = пациент, несмотря на нулевой номер):
{"turns": [
  {"turn_index": 0, "speaker_label": "speaker_0", "text": "Здравствуйте, доктор. У меня третий день болит горло.", "role": "patient"},
  {"turn_index": 1, "speaker_label": "speaker_1", "text": "Здравствуйте. Температуру измеряли?", "role": "doctor"},
  {"turn_index": 2, "speaker_label": "speaker_0", "text": "Да, вчера было 37.8.", "role": "patient"},
  {"turn_index": 3, "speaker_label": "speaker_1", "text": "Хорошо, давайте посмотрим горло и сдадим общий анализ крови.", "role": "doctor"}
]}`;
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

  // Rule 2 of the prompt (one label = one role) is enforced in code rather than
  // trusted: an LLM that flip-flops mid-dialogue gets repaired by majority vote.
  return enforceLabelRoleConsistency(parsed.data.turns);
}

function mockAssignRoles(turns: StructuredTurn[]): RoledTurn[] {
  return assignRolesHeuristically(turns);
}

// --- Role heuristics: used by the mock provider and as a deterministic
// --- last resort when no LLM judgement is available.

const DOCTOR_MARKERS: RegExp[] = [
  /\bчто вас беспокоит\b/i,
  /\bна что жалуетесь\b/i,
  /\bкак давно\b/i,
  /\bкогда (?:это )?началось\b/i,
  /\bизмеряли\b/i,
  /\bпринимали ли\b/i,
  /\bпринимаете\b/i,
  /\bбеспокоит ли\b/i,
  /\bесть ли у вас\b/i,
  /\bваш[аиеу]?\b/i,
  /\bвас\b/i,
  /\bвам\b/i,
  /\bдавайте\b/i,
  /\bназнач(?:у|им|аю)\b/i,
  /\bрекомендую\b/i,
  /\bсдади?м\b/i,
  /\bсдать\b/i,
  /\bосмотр(?:им|ю)?\b/i,
  /\bанализ\b/i,
  /\bобследовани/i,
  /\bдиагноз\b/i,
  /\bаллерги[яи]\b.*\?/i,
];

const PATIENT_MARKERS: RegExp[] = [
  /\bу меня\b/i,
  /\bмне\b/i,
  /\bменя беспокоит\b/i,
  /\bя чувствую\b/i,
  /\bя принимал/i,
  /\bпринимал[аи]?\b/i,
  /\bболит\b/i,
  /\bболи?т?\s|\bболь\b/i,
  /\bдоктор\b/i,
  /\bврач\b/i,
  /\bне помогает\b/i,
  /\bстало хуже\b/i,
  /\bя не\b/i,
];

/** Positive score = sounds like a doctor, negative = sounds like a patient. */
function scoreTurnText(text: string): number {
  let score = 0;
  for (const marker of DOCTOR_MARKERS) if (marker.test(text)) score += 1;
  for (const marker of PATIENT_MARKERS) if (marker.test(text)) score -= 1;
  // A question about the other person is the single strongest doctor signal.
  if (/\?/.test(text) && !/\bу меня\b/i.test(text)) score += 1;
  return score;
}

/**
 * Assigns doctor/patient roles from dialogue content alone, guaranteeing that
 * one speaker_label maps to exactly one role.
 *
 * An explicitly semantic label ("doctor"/"врач") is honoured; a positional label
 * ("speaker_0") never is. When two labels are present the one that sounds more
 * like a clinician becomes the doctor and the other becomes the patient, so the
 * pair is always complementary even if both score the same sign.
 */
export function assignRolesHeuristically(turns: StructuredTurn[]): RoledTurn[] {
  if (!turns.length) return [];

  const scores = new Map<string, number>();
  const firstSeen: string[] = [];
  for (const turn of turns) {
    if (!scores.has(turn.speaker_label)) {
      scores.set(turn.speaker_label, 0);
      firstSeen.push(turn.speaker_label);
    }
    scores.set(turn.speaker_label, scores.get(turn.speaker_label)! + scoreTurnText(turn.text));
  }

  const roleByLabel = new Map<string, DialogueRole>();

  // 1. Labels that already state the role explicitly.
  for (const label of firstSeen) {
    const lower = label.toLowerCase();
    if (lower.includes('doctor') || lower.includes('врач')) roleByLabel.set(label, 'doctor');
    else if (lower.includes('patient') || lower.includes('пациент')) roleByLabel.set(label, 'patient');
  }

  // 2. Exactly two undecided labels: the more clinician-sounding one is the doctor.
  const undecided = firstSeen.filter((label) => !roleByLabel.has(label));
  if (undecided.length === 2) {
    const [a, b] = undecided;
    const scoreA = scores.get(a)!;
    const scoreB = scores.get(b)!;
    // Ties fall back to speaking order, which is stable and reproducible.
    const doctorLabel = scoreA === scoreB ? a : scoreA > scoreB ? a : b;
    roleByLabel.set(doctorLabel, 'doctor');
    roleByLabel.set(doctorLabel === a ? b : a, 'patient');
  } else {
    // 3. Any other count: decide each label on its own score. A non-positive
    //    score means "describes their own state" -> patient.
    for (const label of undecided) {
      roleByLabel.set(label, scores.get(label)! > 0 ? 'doctor' : 'patient');
    }
  }

  return turns.map((turn) => ({ ...turn, role: roleByLabel.get(turn.speaker_label)! }));
}

/**
 * Forces one speaker_label to carry a single role across the dialogue by taking
 * the majority role the model assigned to that label (ties keep the first one).
 */
export function enforceLabelRoleConsistency(turns: RoledTurn[]): RoledTurn[] {
  const tally = new Map<string, { doctor: number; patient: number; first: DialogueRole }>();

  for (const turn of turns) {
    const current = tally.get(turn.speaker_label) ?? { doctor: 0, patient: 0, first: turn.role };
    current[turn.role] += 1;
    tally.set(turn.speaker_label, current);
  }

  const roleByLabel = new Map<string, DialogueRole>();
  for (const [label, counts] of tally) {
    if (counts.doctor === counts.patient) roleByLabel.set(label, counts.first);
    else roleByLabel.set(label, counts.doctor > counts.patient ? 'doctor' : 'patient');
  }

  return turns.map((turn) => ({ ...turn, role: roleByLabel.get(turn.speaker_label)! }));
}
