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
  });

  describe('Alem provider — two sequential LLM calls', () => {
    function stubAlemEnv() {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-key-123';
      process.env.ALEM_BASE_URL = 'https://llm.alem.ai/v1';
    }

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
