import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as diagnoseRoute } from '@/app/api/clinical/diagnose/route';
import { POST as refineRoute } from '@/app/api/clinical/refine/route';
import {
  generateAlemClinicalFallback,
  normalizeDiagnosisItem,
  normalizeDiagnoseResponse,
} from '@/lib/ai/clinical-service.server';
import { DiagnoseResponseSchema } from '@/domain/schemas';

vi.mock('server-only', () => ({}));

describe('Stage 3 — Clinical Rationale & RAG Refine Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Top-3 Diagnoses Rationale & Summary', () => {
    it('1. Every top-3 diagnosis has clinical_rationale.summary', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const response = await generateAlemClinicalFallback('Боль в груди и одышка', 'test-req-1');
      expect(response.diagnoses.length).toBeGreaterThan(0);

      for (const diag of response.diagnoses.slice(0, 3)) {
        expect(diag.clinical_rationale).toBeDefined();
        expect(diag.clinical_rationale?.summary).toBeDefined();
        expect(diag.clinical_rationale?.summary.length).toBeGreaterThan(5);
      }
    });
  });

  describe('2-3. Patient Evidence & Fact Filtering', () => {
    it('2. Supporting patient evidence occurs in the input request query', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const query = 'У пациента приступ сильной давящей боли за грудиной и потливость.';
      const response = await generateAlemClinicalFallback(query, 'test-req-2');

      const diag1 = response.diagnoses[0];
      const facts = diag1.clinical_rationale?.supporting_patient_facts || [];

      for (const f of facts) {
        if (f.patient_evidence) {
          expect(query.toLowerCase()).toContain(f.patient_evidence.toLowerCase().slice(0, 15));
        }
      }
    });

    it('3. Unknown criteria do not end up in supporting facts (placed in missing/conflicting facts)', async () => {
      const rawDiag = {
        rank: 1,
        diagnosis: 'Тестовый диагноз',
        icd10_code: 'T00',
        clinical_rationale: {
          summary: 'Тестовое резюме',
          supporting_patient_facts: [{ fact: 'Болевой синдром', patient_evidence: 'болит' }],
          missing_or_conflicting_facts: ['Анализ крови на тропонин не проводился'],
          why_this_rank: 'Первое место',
          next_discriminator: 'Провести ЭКГ',
          source_ids: [],
        },
      };

      const normalized = normalizeDiagnosisItem(rawDiag, 0, new Set());
      expect(normalized.clinical_rationale?.supporting_patient_facts.length).toBe(1);
      expect(normalized.clinical_rationale?.missing_or_conflicting_facts).toContain('Анализ крови на тропонин не проводился');
    });
  });

  describe('4-5. Source Isolation & Fallback Integrity', () => {
    it('4. Every source_id in rationale exists in top-level sources', () => {
      const availableSources = new Set(['prot-100', 'prot-200']);
      const rawDiag = {
        rank: 1,
        diagnosis: 'Инфаркт миокарда',
        icd10_code: 'I21',
        clinical_rationale: {
          summary: 'Резюме',
          source_ids: ['prot-100', 'fake-prot-999'],
        },
      };

      const normalized = normalizeDiagnosisItem(rawDiag, 0, availableSources);
      expect(normalized.clinical_rationale?.source_ids).toEqual(['prot-100']);
      expect(normalized.clinical_rationale?.source_ids).not.toContain('fake-prot-999');
    });

    it('5. Fallback mode has NO fake sources (sources: [])', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const response = await generateAlemClinicalFallback('Кашель и высокая температура', 'test-req-5');
      expect(response.sources).toEqual([]);
      expect(response.rag_status).toBe('fallback');

      for (const d of response.diagnoses) {
        expect(d.clinical_rationale?.source_ids).toEqual([]);
      }
    });
  });

  describe('8-9. Refine Flow & Error State Retention', () => {
    it('8. Refine preserves case_id across requests', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const req = new Request('http://localhost/api/clinical/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: 'case-test-123',
          symptoms: 'Боль в груди',
          additional_info: 'ЭКГ без подъема ST',
        }),
      });

      const res = await refineRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.case_id).toBe('case-test-123');
    });

    it('9. Refine input validation handles bad inputs gracefully without erasing state', async () => {
      const req = new Request('http://localhost/api/clinical/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: 'case-999',
          symptoms: '',
          additional_info: '',
        }),
      });

      const res = await refineRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.code).toBe('EMPTY_REFINE_INPUT');
    });
  });

  describe('10-12. RAG Status & Normalization', () => {
    it('10. Empty RAG response has honest rag_status (rag-empty or fallback)', () => {
      const normalized = normalizeDiagnoseResponse(
        { case_id: 'c1', diagnoses: [], sources: [] },
        'req-empty',
        'rag-empty',
      );

      expect(normalized.rag_status).toBe('rag-empty');
      expect(normalized.sources).toEqual([]);
    });

    it('11. TypeScript Zod validates DiagnoseResponse schema', () => {
      const sample = {
        case_id: 'c-schema-test',
        diagnoses: [
          {
            rank: 1,
            diagnosis: 'Пневмония',
            icd10_code: 'J18.9',
            confidence: 'high',
            clinical_rationale: {
              summary: 'Симптомы инфильтрации',
              supporting_patient_facts: [{ fact: 'Кашель', patient_evidence: 'кашель' }],
              missing_or_conflicting_facts: [],
              why_this_rank: 'Первая позиция',
              next_discriminator: 'Рентген',
              source_ids: [],
            },
          },
        ],
        sources: [],
        follow_up_questions: [],
        rag_status: 'fallback',
        cached_context: false,
        interaction_count: 1,
        generation_provider: 'alem',
      };

      const parsed = DiagnoseResponseSchema.safeParse(sample);
      expect(parsed.success).toBe(true);
    });

    it('12. Old why_this_diagnosis is normalized into clinical_rationale.summary', () => {
      const rawDiag = {
        rank: 1,
        diagnosis: 'ГЭРБ',
        icd10_code: 'K21.9',
        why_this_diagnosis: 'Изжога после еды усиливается в положении лежа.',
      };

      const normalized = normalizeDiagnosisItem(rawDiag, 0, new Set());
      expect(normalized.clinical_rationale?.summary).toBe('Изжога после еды усиливается в положении лежа.');
    });
  });

  describe('13-17. Provider Isolation & Fallback Assertions', () => {
    it('13-15. Fallback calls Alem/Mock, never OpenAI text chat endpoints', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-key-test';
      process.env.ALEM_BASE_URL = 'https://llm.alem.ai/v1';
      process.env.OPENAI_API_KEY = 'sk-should-not-be-read';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    case_id: 'alem-c1',
                    diagnoses: [
                      {
                        rank: 1,
                        diagnosis: 'Тестовый диагноз',
                        icd10_code: 'R69',
                        confidence: 'high',
                        clinical_rationale: {
                          summary: 'Обоснование от AlemLLM',
                          supporting_patient_facts: [],
                          missing_or_conflicting_facts: [],
                          why_this_rank: '1',
                          next_discriminator: 'Анализ',
                          source_ids: [],
                        },
                      },
                    ],
                  }),
                },
              },
            ],
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost/api/clinical/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptoms: 'Острый приступ головной боли' }),
      });

      const res = await diagnoseRoute(req);
      expect(res.status).toBe(200);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('llm.alem.ai');
      expect(url).not.toContain('api.openai.com');
      expect(init.headers.authorization).toBe('Bearer alem-key-test');
    });

    it('16. generation_provider is correctly returned in response metadata', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const response = await generateAlemClinicalFallback('Тест', 'req-16');
      expect(response.generation_provider).toBe('mock');
    });

    it('17. Mock mode obeys production contract and Zod schema', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const response = await generateAlemClinicalFallback('Головная боль 2 дня', 'req-17');
      const parseResult = DiagnoseResponseSchema.safeParse(response);

      expect(parseResult.success).toBe(true);
      expect(response.diagnoses.length).toBe(3);
    });
  });
});
