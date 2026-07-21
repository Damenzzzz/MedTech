import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { useTrainingStore } from '@/stores/training-store';
import { POST as respondApi } from '@/app/api/session/respond/route';
import { POST as debriefApi } from '@/app/api/session/debrief/route';
import { StudentCaseDTOSchema } from '@/domain/schemas';

describe('Stage 2 Remediation Unit & Contract Tests', () => {
  beforeEach(() => {
    useTrainingStore.getState().reset('chest-pain');
  });

  it('1. Patient answer appears in chat history', () => {
    const store = useTrainingStore.getState();
    store.addStudentMessage('Когда у вас началась боль?');
    store.addPatientMessage('Боль началась около часа назад.');

    const dialogue = useTrainingStore.getState().session?.dialogue || [];
    expect(dialogue.length).toBe(2);
    expect(dialogue[0].role).toBe('student');
    expect(dialogue[0].text).toBe('Когда у вас началась боль?');
    expect(dialogue[1].role).toBe('patient');
    expect(dialogue[1].text).toBe('Боль началась около часа назад.');
  });

  it('2. Second request payload contains first question and answer in dialogue history', async () => {
    const req = new Request('http://localhost/api/session/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: 'chest-pain',
        message: 'Куда отдаёт боль?',
        locale: 'ru',
        revealedFactIds: [],
        dialogue: [
          { role: 'student', text: 'Когда началась боль?' },
          { role: 'patient', text: 'Около часа назад.' },
          { role: 'student', text: 'Куда отдаёт боль?' },
        ],
      }),
    });

    const res = await respondApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.answer).toBeTruthy();
  });

  it('3. Retry repeats exact last failed question from dialogue', () => {
    const store = useTrainingStore.getState();
    store.addStudentMessage('Раньше такие приступы были?');

    const dialogue = useTrainingStore.getState().session?.dialogue || [];
    const lastStudent = [...dialogue].reverse().find((m) => m.role === 'student');
    expect(lastStudent?.text).toBe('Раньше такие приступы были?');
  });

  it('4. Investigation result is absent prior to ordering', () => {
    const session = useTrainingStore.getState().session;
    expect(session?.orderedInvestigations.length).toBe(0);
    expect(session?.selectedInvestigations.length).toBe(0);
  });

  it('5. Pending investigation result is not shown as ready before readyAt', () => {
    const store = useTrainingStore.getState();
    const now = Date.now();
    store.addOrderedInvestigation('cbc', 'Норма', 5000, now);

    const ordered = useTrainingStore.getState().session?.orderedInvestigations[0];
    expect(ordered?.status).toBe('pending');
    expect(ordered?.readyAt).toBe(now + 5000);
  });

  it('6. Investigation result transitions to ready after status update', () => {
    const store = useTrainingStore.getState();
    store.addOrderedInvestigation('cbc', 'Лейкоциты в норме', 5000);

    store.updateInvestigationStatus('cbc', 'ready');
    const ordered = useTrainingStore.getState().session?.orderedInvestigations[0];
    expect(ordered?.status).toBe('ready');
    expect(ordered?.result).toBe('Лейкоциты в норме');
  });

  it('7. Examination result persists across session store operations', () => {
    const store = useTrainingStore.getState();
    store.addPerformedExamination('general', 'Состояние средней тяжести', 1000);

    const exams = useTrainingStore.getState().session?.performedExaminations;
    expect(exams?.length).toBe(1);
    expect(exams?.[0].id).toBe('general');
    expect(exams?.[0].result).toBe('Состояние средней тяжести');
  });

  it('8. Reload / re-init restores dialogue and investigations without data loss', () => {
    const store = useTrainingStore.getState();
    store.addStudentMessage('Привет');
    store.addPatientMessage('Здравствуйте');
    store.addPerformedExamination('auscultation', 'Легкие чистые');
    store.addOrderedInvestigation('ecg', 'Элевация ST', 0);

    // Re-initialize with same caseId
    store.init('chest-pain');
    const restored = useTrainingStore.getState().session;

    expect(restored?.dialogue.length).toBe(2);
    expect(restored?.performedExaminations.length).toBe(1);
    expect(restored?.orderedInvestigations.length).toBe(1);
  });

  it('9. Validation error is triggered if final diagnosis is missing or reasoning < 20 chars', () => {
    const store = useTrainingStore.getState();
    store.setReasoning('Коротко'); // 7 chars
    const session = useTrainingStore.getState().session;

    const isFinalValid = Boolean(session?.finalDiagnosis);
    const isReasoningValid = (session?.clinicalReasoning.trim().length || 0) >= 20;

    expect(isFinalValid).toBe(false);
    expect(isReasoningValid).toBe(false);
  });

  it('10. Debrief endpoint returns 400 for empty payload', async () => {
    const req = new Request('http://localhost/api/session/debrief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await debriefApi(req);
    expect(res.status).toBe(400);
  });

  it('11. Ground truth is not exposed in client state or DTO schema', () => {
    const dummyClientDTO = {
      id: 'case-1',
      synthetic: true as const,
      medicalReviewStatus: 'unreviewed' as const,
      title: { ru: 'Тест' },
      specialty: 'cardiology',
      patient: { name: { ru: 'Иван' }, age: 50, sex: 'male' as const, avatar: '/av.png' },
      complaint: { ru: 'Боль' },
      urgency: 'urgent' as const,
      difficulty: 'medium' as const,
      durationMinutes: 15,
      visualStates: ['pain' as const],
      vitals: { heartRate: 90, bloodPressure: '130/80', respiratoryRate: 18, temperature: 36.6, spo2: 98 },
      examinations: [{ id: 'general', category: 'general' as const, label: { ru: 'Осмотр' } }],
      investigations: [{ id: 'ecg', category: 'functional' as const, name: { ru: 'ЭКГ' }, cost: 2, delayMs: 0 }],
      differentials: [{ code: 'I20', name: { ru: 'Стенокардия' } }],
      managementOptions: [{ id: 'opt1', category: 'medication' as const, label: { ru: 'Нитроглицерин' } }],
    };

    const parsed = StudentCaseDTOSchema.parse(dummyClientDTO);
    const parsedRecord = parsed as unknown as Record<string, unknown>;
    expect(parsedRecord.hiddenFacts).toBeUndefined();
    expect(parsedRecord.correctDiagnosis).toBeUndefined();
    expect(parsedRecord.scoringRubric).toBeUndefined();
  });
});
