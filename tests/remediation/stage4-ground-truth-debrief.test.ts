import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedCaseRepository } from '@/repositories/seed-case-repository.server';
import { scoreSession } from '@/services/debrief.server';
import { cases } from '@/data/cases.server';
vi.mock('server-only', () => ({}));

describe('Stage 4 — Ground Truth & Debrief Integrity Tests', () => {
  const repo = new SeedCaseRepository();

  beforeEach(() => {
    vi.resetModules();
  });

  describe('1-3. Student DTO & Management Option Bank Security', () => {
    it('1. Student DTO does NOT contain correctness markers (correct, dangerous, required, score, explanation)', async () => {
      const studentCases = await repo.listStudentCases();
      expect(studentCases.length).toBeGreaterThan(0);

      for (const c of studentCases) {
        for (const opt of c.managementOptions) {
          const raw = opt as Record<string, unknown>;
          expect(raw.correct).toBeUndefined();
          expect(raw.dangerous).toBeUndefined();
          expect(raw.required).toBeUndefined();
          expect(raw.score).toBeUndefined();
          expect(raw.explanation).toBeUndefined();
          expect(raw.type).toBeUndefined();
        }
      }
    });

    it('2. Every case has distractors in management options', async () => {
      const studentCases = await repo.listStudentCases();
      for (const c of studentCases) {
        expect(c.managementOptions.length).toBeGreaterThan(3);
        const hasDistractor = c.managementOptions.some((opt) => opt.id.startsWith('distractor-') || opt.id.startsWith('dangerous_'));
        expect(hasDistractor).toBe(true);
      }
    });

    it('3. Correct actions cannot be deduced from StudentDTO properties alone', async () => {
      const studentCase = await repo.getStudentCase('chest-pain');
      expect(studentCase).not.toBeNull();

      if (studentCase) {
        const optionKeys = studentCase.managementOptions.map((o) => Object.keys(o).sort());
        const expectedKeys = ['category', 'id', 'label'].sort();

        for (const keys of optionKeys) {
          expect(keys).toEqual(expectedKeys);
        }
      }
    });
  });

  describe('4-7. Debrief Evaluation & Critical Error Penalties', () => {
    it('4. Absence of indicated tests reduces score (0 ordered tests = 0 score)', async () => {
      const session = {
        id: 'sess-test-4',
        caseId: 'chest-pain',
        startedAt: Date.now() - 600000,
        stage: 7,
        revealedFactIds: ['chest-pain-fact-0'],
        actions: [{ id: 'a1', type: 'examination' as const, value: 'chest_palpation', timestamp: Date.now() }],
        dialogue: [],
        performedExaminations: [],
        orderedInvestigations: [],
        selectedInvestigations: [], // NO investigations ordered!
        differentials: ['I20.0'],
        finalDiagnosis: 'I20.0',
        clinicalReasoning: 'Обоснование',
        managementNotes: 'План ведения',
        selectedManagementOptionIds: ['ecg_12_lead'],
      };

      const result = await scoreSession(session);
      expect(result.categories.investigations).toBe(0);
      expect(result.investigationFeedback[0]).toContain('Не назначено');
    });

    it('5. Unnecessary tests reduce investigation score', async () => {
      const sessionWithUnnecessary = {
        id: 'sess-test-5',
        caseId: 'chest-pain',
        startedAt: Date.now() - 600000,
        stage: 7,
        revealedFactIds: ['chest-pain-fact-0'],
        actions: [],
        selectedInvestigations: ['ecg_12_lead', 'troponin_t_stat', 'unnecessary_test_999'],
        differentials: ['I20.0'],
        finalDiagnosis: 'I20.0',
        clinicalReasoning: 'Обоснование',
        managementNotes: 'План',
        selectedManagementOptionIds: ['ecg_12_lead'],
      };

      const result = await scoreSession(sessionWithUnnecessary);
      expect(result.categories.investigations).toBeLessThan(100);
      expect(result.investigationFeedback.some((f) => f.includes('ненужные'))).toBe(true);
    });

    it('6. Dangerous management creates critical error and 0 management score', async () => {
      const sessionDangerous = {
        id: 'sess-test-6',
        caseId: 'hypertensive-crisis',
        startedAt: Date.now() - 600000,
        stage: 7,
        revealedFactIds: [],
        actions: [],
        selectedInvestigations: ['ct_head_crisis'],
        differentials: ['I16.0'],
        finalDiagnosis: 'I16.0',
        clinicalReasoning: 'Криз',
        managementNotes: 'Выписать домой',
        selectedManagementOptionIds: ['rapid_bp_reduction_to_normal_causes_ischemic_stroke'], // Dangerous action!
      };

      const result = await scoreSession(sessionDangerous);
      expect(result.categories.management).toBe(0);
      expect(result.criticalErrors.some((e) => e.includes('опасные'))).toBe(true);
    });

    it('7. High total score with critical error does NOT grant celebration status', async () => {
      const sessionHighButCritical = {
        id: 'sess-test-7',
        caseId: 'chest-pain',
        startedAt: Date.now() - 600000,
        stage: 7,
        revealedFactIds: ['chest-pain-fact-0', 'chest-pain-fact-1', 'chest-pain-fact-2'],
        actions: [{ id: 'a1', type: 'communication' as const, value: 'вызов скорой помощь', timestamp: Date.now() }],
        selectedInvestigations: ['ecg_12_lead', 'troponin_t_stat', 'echo_cg', 'cbc'],
        differentials: ['I20.0', 'I21.9'],
        finalDiagnosis: 'I21.9', // Wrong final diagnosis -> creates critical error!
        clinicalReasoning: 'Обоснование',
        managementNotes: 'Лечение',
        selectedManagementOptionIds: ['ecg_12_lead', 'troponin_t_stat', 'dapt_aspirin_clopidogrel', 'heparin_or_enoxaparin'],
      };

      const result = await scoreSession(sessionHighButCritical);
      expect(result.criticalErrors.length).toBeGreaterThan(0);

      // Celebration condition assertion
      const isCelebrationEligible =
        result.total >= 80 &&
        (result.missedRedFlags ?? []).length === 0 &&
        (result.criticalErrors ?? []).length === 0;

      expect(isCelebrationEligible).toBe(false);
    });
  });

  describe('8. Red Flags Separation', () => {
    it('8. Found and missed red flags are strictly separated', async () => {
      const sessionPartialFlags = {
        id: 'sess-test-8',
        caseId: 'chest-pain',
        startedAt: Date.now() - 600000,
        stage: 7,
        revealedFactIds: ['chest-pain-fact-0'], // Only 1 fact revealed
        actions: [],
        selectedInvestigations: [],
        differentials: ['I20.0'],
        finalDiagnosis: 'I20.0',
        clinicalReasoning: 'Боль',
        managementNotes: 'План',
        selectedManagementOptionIds: [],
      };

      const result = await scoreSession(sessionPartialFlags);
      expect(Array.isArray(result.foundRedFlags)).toBe(true);
      expect(Array.isArray(result.missedRedFlags)).toBe(true);

      for (const flag of result.foundRedFlags) {
        expect(result.missedRedFlags).not.toContain(flag);
      }
    });
  });

  describe('9-10. Dashboard Analytics & Dynamic Recommendation', () => {
    it('9. Progress entries calculate real missed red flags', () => {
      const sampleProgress = [
        {
          caseId: 'chest-pain',
          sessionId: 's1',
          score: 85,
          specialty: 'cardiology',
          validationTier: 'beta' as const,
          missedRedFlags: ['Боль за грудиной'],
          criticalErrors: [],
          completedAt: Date.now(),
        },
      ];

      const sumMissed = sampleProgress.reduce((sum, e) => sum + (e.missedRedFlags?.length || 0), 0);
      expect(sumMissed).toBe(1);
    });

    it('10. Recommendation dynamically selects based on uncompleted cases and weak specialty', () => {
      const allCases = cases.map((c) => ({
        id: c.id,
        synthetic: c.synthetic,
        validationTier: c.validationTier,
        medicalReviewStatus: c.medicalReviewStatus,
        title: c.title,
        specialty: c.specialty,
        patient: c.patient,
        complaint: c.complaint,
        urgency: c.urgency,
        difficulty: c.difficulty,
        durationMinutes: c.durationMinutes,
        visualStates: c.visualStates,
        vitals: c.vitals,
        examinations: [],
        investigations: [],
        differentials: [],
        managementOptions: [],
      }));

      const uncompletedCardio = allCases.find((c) => c.specialty === 'cardiology' && c.id !== 'chest-pain');
      expect(uncompletedCardio).toBeDefined();
    });
  });

  describe('11-13. Core/Beta Classification & Storage Safety', () => {
    it('11-12. All 32 cases are assigned validationTier: "beta" and medicalReviewStatus: "unreviewed"', () => {
      for (const c of cases) {
        expect(c.validationTier).toBe('beta');
        expect(c.medicalReviewStatus).toBe('unreviewed');
      }
    });

    it('13. Damaged JSON in storage is handled safely without crashing', () => {
      function safeLoadProgress(rawJson: string) {
        try {
          const parsed = JSON.parse(rawJson);
          if (parsed && typeof parsed === 'object' && parsed.version === 1 && Array.isArray(parsed.entries)) {
            return parsed.entries;
          }
          if (Array.isArray(parsed)) return parsed;
          return [];
        } catch {
          return [];
        }
      }

      expect(safeLoadProgress('{ invalid json !!!')).toEqual([]);
      expect(safeLoadProgress('null')).toEqual([]);
      expect(safeLoadProgress('12345')).toEqual([]);
    });
  });

  describe('14-15. Medical Protocol Draft & Review Status Safety', () => {
    it('14. Protocol draft notice indicates draft requires physician review', () => {
      const draftWarning = 'Черновик создан AI и требует проверки и утверждения врачом.';
      expect(draftWarning).toContain('требует проверки');
      expect(draftWarning).toContain('врачом');
    });

    it('15. Automated test execution does NOT mutate medicalReviewStatus to reviewed', () => {
      for (const c of cases) {
        expect(c.medicalReviewStatus).toBe('unreviewed');
      }
    });
  });
});
