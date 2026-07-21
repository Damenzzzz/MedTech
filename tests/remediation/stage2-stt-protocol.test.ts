import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as transcribeRoute } from '@/app/api/transcribe/route';
import { POST as protocolRoute } from '@/app/api/encounter/protocol/route';
import { generateEncounterProtocol, computeTranscriptHash } from '@/lib/protocol/encounter-protocol.server';
import { EncounterProtocolSchema, SttResponseSchema } from '@/domain/schemas';

vi.mock('server-only', () => ({}));

function createMockFormRequest(form: FormData): Request {
  const req = new Request('http://localhost/api/transcribe', {
    method: 'POST',
  });
  req.formData = async () => form;
  return req;
}

describe('Stage 2 — STT & Medical Protocol Draft Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1-2. STT Provider Isolation & Endpoint Enforcement', () => {
    it('1. /api/transcribe calls only /v1/audio/transcriptions', async () => {
      process.env.STT_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test-openai-stt';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Тестовая речь',
            duration: 5.2,
            segments: [{ speaker: 'speaker_0', text: 'Тестовая речь', start: 0, end: 5.2 }],
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['dummy audio content'], 'audio.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      expect(res.status).toBe(200);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/v1/audio/transcriptions');
      expect(url).not.toContain('/v1/chat/completions');
      expect(url).not.toContain('/v1/responses');
    });

    it('2. /api/transcribe never calls OpenAI chat completions', async () => {
      process.env.STT_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Тест' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['content'], 'sample.wav', { type: 'audio/wav' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      await transcribeRoute(req);

      for (const call of mockFetch.mock.calls) {
        const url = String(call[0]);
        expect(url).not.toContain('/chat/completions');
      }
    });
  });

  describe('3-4. Protocol Endpoint Isolation (AlemLLM only)', () => {
    it('3. Protocol endpoint calls only Alem / text adapter facade', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-key-123';
      process.env.ALEM_BASE_URL = 'https://llm.alem.ai/v1';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    chiefComplaints: [{ text: 'Головная боль', sourceQuotes: ['болит голова'] }],
                    historyOfPresentIllness: { text: 'Болит 3 дня', sourceQuotes: ['болит 3 дня'] },
                    pastMedicalHistory: [],
                    medications: [],
                    allergies: [],
                    objectiveFindings: [],
                    vitalSigns: [],
                    redFlags: [],
                    assessment: {
                      clinicalSummary: 'ОРВИ',
                      preliminaryDiagnosis: { diagnosis: 'ОРВИ', icd10Code: 'J06.9', sourceQuotes: [], uncertainties: [] },
                      differentialDiagnoses: [],
                    },
                    plan: { investigations: [], treatmentDraft: [], referrals: [], followUp: [], safetyNetting: [] },
                    unresolvedQuestions: [],
                  }),
                },
              },
            ],
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost/api/encounter/protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcriptId: 'tr-1',
          transcriptText: 'Пациент: у меня 3 дня болит голова.',
          turns: [{ speaker: 'patient', text: 'у меня 3 дня болит голова.' }],
          locale: 'ru',
        }),
      });

      const res = await protocolRoute(req);
      expect(res.status).toBe(200);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('llm.alem.ai');
      expect(url).not.toContain('api.openai.com');
    });

    it('4. Protocol endpoint does not read OPENAI_API_KEY', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-secret';
      process.env.OPENAI_API_KEY = 'sk-should-not-be-used-by-protocol';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '{}' } }],
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost/api/encounter/protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcriptId: 'tr-2',
          transcriptText: 'Тестовый диалог',
          turns: [],
          locale: 'ru',
        }),
      });

      await protocolRoute(req);
      const [, fetchInit] = mockFetch.mock.calls[0];
      expect(fetchInit.headers.authorization).toBe('Bearer alem-secret');
      expect(fetchInit.headers.authorization).not.toContain('sk-should-not-be-used');
    });
  });

  describe('5-8. Input Validation & Error Handling in STT', () => {
    it('5. Missing audio file returns 400', async () => {
      const form = new FormData();
      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('AUDIO_MISSING');
    });

    it('6. Audio file > 25MB returns 413 Payload Too Large', async () => {
      process.env.STT_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test';

      const largeBuffer = new Uint8Array(26 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('7. Unsupported MIME / extension returns 415', async () => {
      process.env.STT_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test';

      const file = new File(['exe binary content'], 'executable.exe', { type: 'application/x-msdownload' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      expect(res.status).toBe(415);
      const json = await res.json();
      expect(json.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('8. Missing OPENAI_API_KEY when STT_PROVIDER=openai returns structured config error', async () => {
      process.env.STT_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;

      const file = new File(['content'], 'sample.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('OPENAI_API_KEY');
    });
  });

  describe('12-15. Protocol Caching, Versioning & Contract', () => {
    it('12. Same transcript uses SHA-256 cache without duplicate LLM calls', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const reqInput = {
        transcriptId: 'tr-cache-test',
        transcriptText: 'Пациент: У меня болит голова два дня.',
        turns: [{ speaker: 'patient' as const, text: 'У меня болит голова два дня.' }],
        locale: 'ru' as const,
        regenerate: false,
      };

      const result1 = await generateEncounterProtocol(reqInput);
      expect(result1.cacheHit).toBe(false);

      const result2 = await generateEncounterProtocol(reqInput);
      expect(result2.cacheHit).toBe(true);
      expect(result2.protocol.protocolId).toBe(result1.protocol.protocolId);
    });

    it('13. regenerate=true creates new version (v2) in history', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const reqInput1 = {
        transcriptId: 'tr-version-test',
        transcriptText: 'Пациент: Температура 38.',
        turns: [{ speaker: 'patient' as const, text: 'Температура 38.' }],
        locale: 'ru' as const,
        regenerate: false,
      };

      const result1 = await generateEncounterProtocol(reqInput1);
      expect(result1.protocol.version).toBe(1);

      const reqInput2 = { ...reqInput1, regenerate: true };
      const result2 = await generateEncounterProtocol(reqInput2);

      expect(result2.cacheHit).toBe(false);
      expect(result2.protocol.version).toBe(2);
      expect(result2.protocol.history.length).toBeGreaterThan(0);
    });

    it('14-15. Protocol facts have sourceQuotes and missing info goes to unresolvedQuestions', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const result = await generateEncounterProtocol({
        transcriptId: 'tr-quotes-test',
        transcriptText: 'Пациент: У меня болит голова и температура 38.',
        turns: [
          { speaker: 'patient', text: 'У меня болит голова и температура 38.' },
        ],
        locale: 'ru',
      });

      const p = result.protocol;
      expect(EncounterProtocolSchema.safeParse(p).success).toBe(true);

      // Check sourceQuotes
      for (const complaint of p.sections.chiefComplaints) {
        expect(Array.isArray(complaint.sourceQuotes)).toBe(true);
      }

      // Check unresolved questions present for unconfirmed info
      expect(Array.isArray(p.sections.unresolvedQuestions)).toBe(true);
      expect(p.sections.unresolvedQuestions.length).toBeGreaterThan(0);
    });

    it('16. Raw OpenAI response is NOT returned to client', async () => {
      process.env.STT_PROVIDER = 'mock';

      const file = new File(['mock audio'], 'audio.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file);

      const req = createMockFormRequest(form);

      const res = await transcribeRoute(req);
      const json = await res.json();

      expect(json).not.toHaveProperty('raw');
      expect(SttResponseSchema.safeParse(json).success).toBe(true);
    });

    it('18-19. Mock STT & Mock Alem Protocol conform to production contracts', async () => {
      process.env.STT_PROVIDER = 'mock';
      process.env.LLM_PROVIDER = 'mock';

      // Test Mock STT
      const file = new File(['mock'], 'test.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file);

      const sttRes = await transcribeRoute(createMockFormRequest(form));
      const sttJson = await sttRes.json();
      expect(SttResponseSchema.safeParse(sttJson).success).toBe(true);

      // Test Mock Protocol
      const protocolRes = await generateEncounterProtocol({
        transcriptId: sttJson.transcriptId,
        transcriptText: sttJson.text,
        turns: sttJson.turns,
        locale: 'ru',
      });

      expect(EncounterProtocolSchema.safeParse(protocolRes.protocol).success).toBe(true);
    });
  });

  describe('20. SHA-256 Transcript Hash Computation', () => {
    it('computes deterministic SHA-256 hash for identical transcript input', () => {
      const hash1 = computeTranscriptHash('Текст 1', [{ speaker: 'doctor', text: 'Добрый день' }]);
      const hash2 = computeTranscriptHash('Текст 1', [{ speaker: 'doctor', text: 'Добрый день' }]);
      const hash3 = computeTranscriptHash('Другой текст', [{ speaker: 'doctor', text: 'Добрый день' }]);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(64); // SHA-256 hex length
    });
  });
});
