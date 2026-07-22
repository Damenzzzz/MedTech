// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredDialogueSchema } from '@/domain/schemas';

vi.mock('server-only', () => ({}));

function alemChatResponse(content: string) {
  return {
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
  };
}

function stubAlemEnv() {
  process.env.LLM_PROVIDER = 'alem';
  process.env.ALEM_API_KEY = 'alem-key-123';
  process.env.ALEM_BASE_URL = 'https://llm.alem.ai/v1';
}

describe('Dialogue structuring & speaker role assignment (Prompt A + Prompt B)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('Mock provider (deterministic, no network calls)', () => {
    it('produces a draft v1 dialogue with role assigned per turn, without inventing turns', async () => {
      process.env.LLM_PROVIDER = 'mock';
      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      const input = {
        transcriptId: 'tr-1',
        transcriptText: 'Здравствуйте, доктор. У меня болит голова. Как давно болит?',
        turns: [
          { speaker: 'patient' as const, text: 'Здравствуйте, доктор. У меня болит голова.', start: 0 },
          { speaker: 'doctor' as const, text: 'Как давно болит?', start: 3 },
        ],
        locale: 'ru' as const,
      };

      const { dialogue, cacheHit } = await generateStructuredDialogue(input);

      expect(cacheHit).toBe(false);
      expect(StructuredDialogueSchema.safeParse(dialogue).success).toBe(true);
      expect(dialogue.status).toBe('draft');
      expect(dialogue.version).toBe(1);
      expect(dialogue.turns).toHaveLength(2);
      expect(dialogue.turns[0]).toMatchObject({ turn_index: 0, role: 'patient', text: input.turns[0].text });
      expect(dialogue.turns[1]).toMatchObject({ turn_index: 1, role: 'doctor', text: input.turns[1].text });
    });

    it('caches by transcript hash and skips regeneration unless regenerate=true', async () => {
      process.env.LLM_PROVIDER = 'mock';
      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      const input = {
        transcriptId: 'tr-cache',
        transcriptText: 'Пациент жалуется на кашель.',
        turns: [{ speaker: 'patient' as const, text: 'У меня кашель уже неделю.' }],
        locale: 'ru' as const,
      };

      const first = await generateStructuredDialogue(input);
      expect(first.cacheHit).toBe(false);

      const second = await generateStructuredDialogue(input);
      expect(second.cacheHit).toBe(true);
      expect(second.dialogue.dialogueId).toBe(first.dialogue.dialogueId);

      const third = await generateStructuredDialogue({ ...input, regenerate: true });
      expect(third.cacheHit).toBe(false);
      expect(third.dialogue.version).toBe(2);
      expect(third.dialogue.history.length).toBeGreaterThan(1);
    });

    it('keeps one speaker_label consistently mapped to one role', async () => {
      process.env.LLM_PROVIDER = 'mock';
      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      const input = {
        transcriptId: 'tr-consistency',
        transcriptText: 'Диалог из нескольких реплик подряд от одного спикера.',
        turns: [
          { speaker: 'unknown' as const, text: 'Реплика 1' },
          { speaker: 'unknown' as const, text: 'Реплика 2' },
          { speaker: 'doctor' as const, text: 'Реплика 3' },
          { speaker: 'unknown' as const, text: 'Реплика 4' },
        ],
        locale: 'ru' as const,
      };

      const { dialogue } = await generateStructuredDialogue(input);
      const unknownRoles = dialogue.turns.filter((t) => t.speaker_label === 'unknown').map((t) => t.role);
      expect(new Set(unknownRoles).size).toBe(1);
    });

    it('derives roles from positional diarization labels by meaning, not by speaker index', async () => {
      process.env.LLM_PROVIDER = 'mock';
      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      // speaker_0 is the PATIENT here — the old index mapping would have called it the doctor.
      const { dialogue } = await generateStructuredDialogue({
        transcriptId: 'tr-positional',
        transcriptText: 'Диалог с позиционными метками.',
        turns: [
          { speaker: 'unknown' as const, speakerLabel: 'speaker_0', text: 'Здравствуйте, доктор. У меня третий день болит горло.' },
          { speaker: 'unknown' as const, speakerLabel: 'speaker_1', text: 'Здравствуйте. Как давно поднялась температура, измеряли?' },
          { speaker: 'unknown' as const, speakerLabel: 'speaker_0', text: 'Да, вчера было 37.8, я принимал парацетамол.' },
          { speaker: 'unknown' as const, speakerLabel: 'speaker_1', text: 'Хорошо, давайте сдадим общий анализ крови и осмотрим горло.' },
        ],
        locale: 'ru' as const,
      });

      const roleFor = (label: string) => dialogue.turns.find((t) => t.speaker_label === label)?.role;
      expect(roleFor('speaker_0')).toBe('patient');
      expect(roleFor('speaker_1')).toBe('doctor');
    });
  });

  describe('Heuristic role fallback (no LLM judgement available)', () => {
    it('assigns the question-asker as doctor and the symptom-reporter as patient', async () => {
      const { assignRolesHeuristically } = await import('@/lib/dialogue/structure-dialogue.server');

      const roled = assignRolesHeuristically([
        { turn_index: 0, speaker_label: 'speaker_0', text: 'Здравствуйте, доктор. У меня болит голова уже три дня.' },
        { turn_index: 1, speaker_label: 'speaker_1', text: 'Что вас беспокоит ещё? Как давно это началось?' },
        { turn_index: 2, speaker_label: 'speaker_0', text: 'Мне не помогает парацетамол, стало хуже.' },
      ]);

      expect(roled.map((t) => t.role)).toEqual(['patient', 'doctor', 'patient']);
    });

    it('is not fooled when the doctor happens to speak first', async () => {
      const { assignRolesHeuristically } = await import('@/lib/dialogue/structure-dialogue.server');

      const roled = assignRolesHeuristically([
        { turn_index: 0, speaker_label: 'speaker_0', text: 'Добрый день, что вас беспокоит?' },
        { turn_index: 1, speaker_label: 'speaker_1', text: 'У меня болит спина, я принимал обезболивающее.' },
        { turn_index: 2, speaker_label: 'speaker_0', text: 'Давайте назначим анализ и осмотрим вас.' },
      ]);

      expect(roled[0].role).toBe('doctor');
      expect(roled[1].role).toBe('patient');
      expect(roled[2].role).toBe('doctor');
    });

    it('always yields exactly one role per speaker_label', async () => {
      const { assignRolesHeuristically } = await import('@/lib/dialogue/structure-dialogue.server');

      const roled = assignRolesHeuristically([
        { turn_index: 0, speaker_label: 'speaker_0', text: 'У меня болит горло.' },
        { turn_index: 1, speaker_label: 'speaker_1', text: 'Как давно?' },
        { turn_index: 2, speaker_label: 'speaker_0', text: 'Хорошо.' },
        { turn_index: 3, speaker_label: 'speaker_1', text: 'Понятно.' },
      ]);

      const rolesByLabel = new Map<string, Set<string>>();
      for (const turn of roled) {
        const set = rolesByLabel.get(turn.speaker_label) ?? new Set();
        set.add(turn.role);
        rolesByLabel.set(turn.speaker_label, set);
      }
      for (const set of rolesByLabel.values()) expect(set.size).toBe(1);
      // Two speakers must be complementary, never both the same role.
      expect(new Set(roled.map((t) => t.role)).size).toBe(2);
    });

    it('honours explicitly semantic labels over content scoring', async () => {
      const { assignRolesHeuristically } = await import('@/lib/dialogue/structure-dialogue.server');

      const roled = assignRolesHeuristically([
        { turn_index: 0, speaker_label: 'doctor', text: 'Здравствуйте.' },
        { turn_index: 1, speaker_label: 'patient', text: 'Здравствуйте.' },
      ]);

      expect(roled[0].role).toBe('doctor');
      expect(roled[1].role).toBe('patient');
    });

    it('returns an empty list for an empty dialogue', async () => {
      const { assignRolesHeuristically } = await import('@/lib/dialogue/structure-dialogue.server');
      expect(assignRolesHeuristically([])).toEqual([]);
    });
  });

  describe('Label/role consistency repair on LLM output', () => {
    it('repairs a label the model flip-flopped on, by majority vote', async () => {
      const { enforceLabelRoleConsistency } = await import('@/lib/dialogue/structure-dialogue.server');

      const repaired = enforceLabelRoleConsistency([
        { turn_index: 0, speaker_label: 'speaker_0', text: 'a', role: 'patient' },
        { turn_index: 1, speaker_label: 'speaker_0', text: 'b', role: 'patient' },
        { turn_index: 2, speaker_label: 'speaker_0', text: 'c', role: 'doctor' },
        { turn_index: 3, speaker_label: 'speaker_1', text: 'd', role: 'doctor' },
      ]);

      expect(repaired.map((t) => t.role)).toEqual(['patient', 'patient', 'patient', 'doctor']);
    });

    it('applies the repair to Prompt B output end to end', async () => {
      stubAlemEnv();

      const structureResponse = JSON.stringify({
        turns: [
          { turn_index: 0, speaker_label: 'speaker_0', text: 'У меня болит голова.' },
          { turn_index: 1, speaker_label: 'speaker_0', text: 'Уже третий день.' },
          { turn_index: 2, speaker_label: 'speaker_1', text: 'Как давно?' },
        ],
      });
      // The model contradicts itself: speaker_0 is patient, then doctor.
      const roleResponse = JSON.stringify({
        turns: [
          { turn_index: 0, speaker_label: 'speaker_0', text: 'У меня болит голова.', role: 'patient' },
          { turn_index: 1, speaker_label: 'speaker_0', text: 'Уже третий день.', role: 'doctor' },
          { turn_index: 2, speaker_label: 'speaker_1', text: 'Как давно?', role: 'doctor' },
        ],
      });

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(alemChatResponse(structureResponse))
        .mockResolvedValueOnce(alemChatResponse(roleResponse));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');
      const { dialogue } = await generateStructuredDialogue({
        transcriptId: 'tr-inconsistent',
        transcriptText: 'У меня болит голова. Уже третий день. Как давно?',
        turns: [],
        locale: 'ru',
      });

      const speaker0Roles = dialogue.turns.filter((t) => t.speaker_label === 'speaker_0').map((t) => t.role);
      expect(new Set(speaker0Roles).size).toBe(1);
      expect(speaker0Roles[0]).toBe('patient');
    });
  });

  describe('Alem provider — two sequential LLM calls', () => {
    it('calls structure prompt then role prompt in order, both hitting only the alem chat endpoint', async () => {
      stubAlemEnv();

      const structureResponse = JSON.stringify({
        turns: [
          { turn_index: 0, speaker_label: 'speaker_0', text: 'Здравствуйте, доктор.' },
          { turn_index: 1, speaker_label: 'speaker_1', text: 'Что вас беспокоит?' },
        ],
      });
      const roleResponse = JSON.stringify({
        turns: [
          { turn_index: 0, speaker_label: 'speaker_0', text: 'Здравствуйте, доктор.', role: 'patient' },
          { turn_index: 1, speaker_label: 'speaker_1', text: 'Что вас беспокоит?', role: 'doctor' },
        ],
      });

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(alemChatResponse(structureResponse))
        .mockResolvedValueOnce(alemChatResponse(roleResponse));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      const { dialogue } = await generateStructuredDialogue({
        transcriptId: 'tr-alem-1',
        transcriptText: 'Здравствуйте, доктор. Что вас беспокоит?',
        turns: [],
        locale: 'ru',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      for (const call of mockFetch.mock.calls) {
        expect(String(call[0])).toContain('llm.alem.ai');
        expect(String(call[0])).not.toContain('api.openai.com');
      }

      expect(dialogue.turns).toEqual([
        expect.objectContaining({ turn_index: 0, speaker_label: 'speaker_0', role: 'patient' }),
        expect.objectContaining({ turn_index: 1, speaker_label: 'speaker_1', role: 'doctor' }),
      ]);
    });

    it('throws an explicit error (not a silent mock fallback) when Prompt A returns invalid JSON', async () => {
      stubAlemEnv();

      const mockFetch = vi.fn().mockResolvedValue(alemChatResponse('this is not json at all'));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue, DialogueStructuringError } = await import(
        '@/lib/dialogue/structure-dialogue.server'
      );

      await expect(
        generateStructuredDialogue({
          transcriptId: 'tr-alem-bad-a',
          transcriptText: 'Текст без структуры.',
          turns: [],
          locale: 'ru',
        }),
      ).rejects.toThrow(DialogueStructuringError);

      // Only Prompt A was attempted; Prompt B must never run on a broken A.
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws an explicit schema-mismatch error when Prompt A JSON does not match the contract', async () => {
      stubAlemEnv();

      const mockFetch = vi.fn().mockResolvedValue(alemChatResponse(JSON.stringify({ turns: 'not-an-array' })));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      await expect(
        generateStructuredDialogue({
          transcriptId: 'tr-alem-bad-a-schema',
          transcriptText: 'Текст.',
          turns: [],
          locale: 'ru',
        }),
      ).rejects.toMatchObject({ code: 'DIALOGUE_STRUCTURE_LLM_INVALID_JSON' });
    });

    it('throws an explicit error when Prompt B (role assignment) returns invalid JSON', async () => {
      stubAlemEnv();

      const structureResponse = JSON.stringify({
        turns: [{ turn_index: 0, speaker_label: 'speaker_0', text: 'Здравствуйте.' }],
      });

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(alemChatResponse(structureResponse))
        .mockResolvedValueOnce(alemChatResponse('not valid json'));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');

      await expect(
        generateStructuredDialogue({
          transcriptId: 'tr-alem-bad-b',
          transcriptText: 'Здравствуйте.',
          turns: [],
          locale: 'ru',
        }),
      ).rejects.toMatchObject({ code: 'DIALOGUE_ROLES_LLM_EMPTY_RESPONSE' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('never reads OPENAI_API_KEY', async () => {
      stubAlemEnv();
      process.env.OPENAI_API_KEY = 'sk-should-not-be-used';

      const structureResponse = JSON.stringify({ turns: [{ turn_index: 0, speaker_label: 's0', text: 'Текст' }] });
      const roleResponse = JSON.stringify({ turns: [{ turn_index: 0, speaker_label: 's0', text: 'Текст', role: 'doctor' }] });

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(alemChatResponse(structureResponse))
        .mockResolvedValueOnce(alemChatResponse(roleResponse));
      vi.stubGlobal('fetch', mockFetch);

      const { generateStructuredDialogue } = await import('@/lib/dialogue/structure-dialogue.server');
      await generateStructuredDialogue({
        transcriptId: 'tr-no-openai',
        transcriptText: 'Текст',
        turns: [],
        locale: 'ru',
      });

      for (const call of mockFetch.mock.calls) {
        const [, init] = call as [string, { headers: Record<string, string> }];
        expect(init.headers.authorization).toBe('Bearer alem-key-123');
      }
    });
  });

  describe('POST /api/encounter/structure-dialogue route', () => {
    it('returns 200 with a schema-valid structured dialogue for the mock provider', async () => {
      process.env.LLM_PROVIDER = 'mock';
      const { POST } = await import('@/app/api/encounter/structure-dialogue/route');

      const req = new Request('http://localhost/api/encounter/structure-dialogue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcriptId: 'tr-route',
          transcriptText: 'Здравствуйте. Что вас беспокоит?',
          turns: [
            { speaker: 'patient', text: 'Здравствуйте.' },
            { speaker: 'doctor', text: 'Что вас беспокоит?' },
          ],
          locale: 'ru',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(StructuredDialogueSchema.safeParse(json).success).toBe(true);
    });

    it('returns 502 with an explicit error code when the LLM response is invalid (not a silent mock)', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-key-123';
      process.env.ALEM_BASE_URL = 'https://llm.alem.ai/v1';

      const mockFetch = vi.fn().mockResolvedValue(alemChatResponse('garbage, not json'));
      vi.stubGlobal('fetch', mockFetch);

      const { POST } = await import('@/app/api/encounter/structure-dialogue/route');

      const req = new Request('http://localhost/api/encounter/structure-dialogue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcriptId: 'tr-route-bad',
          transcriptText: 'Текст',
          turns: [],
          locale: 'ru',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.code).toBe('DIALOGUE_STRUCTURE_LLM_EMPTY_RESPONSE');
    });
  });
});
