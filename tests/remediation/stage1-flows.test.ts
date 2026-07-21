import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as sessionRespond } from '@/app/api/session/respond/route';
import { POST as simulatorRespond } from '@/app/api/simulator/respond/route';
import { useTrainingStore } from '@/stores/training-store';
import { SeedCaseRepository } from '@/repositories/seed-case-repository.server';

// Mock server-only
vi.mock('server-only', () => ({}));

describe('Stage 1 User Flows & Requirements', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.LLM_PROVIDER = 'mock';
  });

  describe('API Endpoint Safety & Validation', () => {
    it('returns 404 for unknown caseId in session/respond', async () => {
      const req = new Request('http://localhost/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: 'unknown-nonexistent-case-id',
          message: 'Здравствуйте',
          locale: 'ru',
          revealedFactIds: [],
          dialogue: [],
        }),
      });
      const res = await sessionRespond(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('case_not_found');
    });

    it('returns 404 for unknown caseId in simulator/respond', async () => {
      const req = new Request('http://localhost/api/simulator/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: 'unknown-nonexistent-case-id',
          message: 'Здравствуйте',
          locale: 'ru',
          dialogue: [],
        }),
      });
      const res = await simulatorRespond(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('case_not_found');
    });

    it('returns 400 for invalid request body in session/respond', async () => {
      const req = new Request('http://localhost/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalidField: true }),
      });
      const res = await sessionRespond(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid request body in simulator/respond', async () => {
      const req = new Request('http://localhost/api/simulator/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalidField: true }),
      });
      const res = await simulatorRespond(req);
      expect(res.status).toBe(400);
    });
  });

  describe('User Path A (AI Assistant -> Simulator) and User Path B (Patients -> Training)', () => {
    it('Path A: simulator/respond handles 2 consecutive questions and preserves history', async () => {
      const caseId = 'chest-pain';

      // 1st question
      const req1 = new Request('http://localhost/api/simulator/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId,
          message: 'Когда началась боль?',
          locale: 'ru',
          dialogue: [],
          revealedFactIds: [],
        }),
      });
      const res1 = await simulatorRespond(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.answer).toBeTruthy();
      expect(data1.provider).toBe('mock');
      expect(data1.requestId).toBeTruthy();

      // 2nd question includes 1st Q&A in dialogue
      const dialogueHistory = [
        { role: 'student' as const, text: 'Когда началась боль?' },
        { role: 'patient' as const, text: data1.answer },
      ];

      const req2 = new Request('http://localhost/api/simulator/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId,
          message: 'Куда отдает боль?',
          locale: 'ru',
          dialogue: dialogueHistory,
          revealedFactIds: data1.revealedFactIds || [],
        }),
      });
      const res2 = await simulatorRespond(req2);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.answer).toBeTruthy();
    });

    it('Path B: session/respond handles 2 consecutive questions and returns metadata', async () => {
      const caseId = 'pneumonia';

      // 1st question
      const req1 = new Request('http://localhost/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId,
          message: 'Сколько дней кашляете?',
          locale: 'ru',
          revealedFactIds: [],
          dialogue: [],
        }),
      });
      const res1 = await sessionRespond(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.answer).toBeTruthy();
      expect(data1.engineMode).toBeTruthy();
      expect(data1.provider).toBe('mock');

      // 2nd question
      const history = [
        { role: 'student' as const, text: 'Сколько дней кашляете?' },
        { role: 'patient' as const, text: data1.answer },
      ];
      const req2 = new Request('http://localhost/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId,
          message: 'Есть ли одышка при ходьбе?',
          locale: 'ru',
          revealedFactIds: data1.revealedFactIds || [],
          dialogue: history,
        }),
      });
      const res2 = await sessionRespond(req2);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.answer).toBeTruthy();
    });
  });

  describe('Session Store Reset on Patient Change', () => {
    it('resets session when a different patient case is initialized', () => {
      const store = useTrainingStore.getState();

      // Init first case
      store.init('chest-pain');
      store.addStudentMessage('Первый вопрос');
      store.addPatientMessage('Первый ответ');
      expect(useTrainingStore.getState().session?.caseId).toBe('chest-pain');
      expect(useTrainingStore.getState().session?.dialogue.length).toBe(2);

      // Change patient to pneumonia
      store.init('pneumonia');
      const newSession = useTrainingStore.getState().session;
      expect(newSession?.caseId).toBe('pneumonia');
      expect(newSession?.dialogue.length).toBe(0);
      expect(newSession?.revealedFactIds.length).toBe(0);
    });

    it('preserves session when same patient case is re-initialized', () => {
      const store = useTrainingStore.getState();

      store.init('asthma');
      store.addStudentMessage('Вопрос по астме');
      expect(useTrainingStore.getState().session?.dialogue.length).toBe(1);

      // Re-init same case
      store.init('asthma');
      expect(useTrainingStore.getState().session?.dialogue.length).toBe(1);
    });
  });

  describe('Ground Truth Exclusion in Student DTOs', () => {
    it('SeedCaseRepository.listStudentCases returns DTOs without ground truth', async () => {
      const repo = new SeedCaseRepository();
      const studentCases = await repo.listStudentCases();

      expect(studentCases.length).toBeGreaterThan(0);
      for (const c of studentCases) {
        expect(c).not.toHaveProperty('hiddenFacts');
        expect(c).not.toHaveProperty('correctDiagnosis');
        expect(c).not.toHaveProperty('expectedActions');
        expect(c).not.toHaveProperty('dangerousActions');
        expect(c).not.toHaveProperty('scoringRubric');
        expect(c).not.toHaveProperty('managementPlan');
      }
    });

    it('SeedCaseRepository.getStudentCase returns DTO without ground truth', async () => {
      const repo = new SeedCaseRepository();
      const c = await repo.getStudentCase('chest-pain');

      expect(c).not.toBeNull();
      expect(c).not.toHaveProperty('hiddenFacts');
      expect(c).not.toHaveProperty('correctDiagnosis');
      expect(c).not.toHaveProperty('scoringRubric');
    });
  });
});
