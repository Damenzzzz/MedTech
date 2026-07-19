import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { useTrainingStore } from '@/stores/training-store';
import { cases } from '@/data/cases.server';

describe('Training Workspace Logic & Session Store', () => {
  const caseId = cases[0].id;

  beforeEach(() => {
    useTrainingStore.getState().reset(caseId);
  });

  it('initializes training session correctly', () => {
    useTrainingStore.getState().init(caseId);
    const session = useTrainingStore.getState().session;

    expect(session).not.toBeNull();
    expect(session?.caseId).toBe(caseId);
    expect(session?.stage).toBe(0);
    expect(session?.revealedFactIds).toEqual([]);
    expect(session?.selectedInvestigations).toEqual([]);
    expect(session?.differentials).toEqual([]);
  });

  it('allows navigating across all 8 stages (0-7)', () => {
    useTrainingStore.getState().init(caseId);

    for (let stage = 0; stage < 8; stage++) {
      useTrainingStore.getState().setStage(stage);
      expect(useTrainingStore.getState().session?.stage).toBe(stage);
    }
  });

  it('records student actions and prevents duplicate investigation orders', () => {
    useTrainingStore.getState().init(caseId);

    useTrainingStore.getState().orderTest('ecg');
    expect(useTrainingStore.getState().session?.selectedInvestigations).toContain('ecg');

    // Attempt duplicate order
    useTrainingStore.getState().orderTest('ecg');
    const orders = useTrainingStore.getState().session?.selectedInvestigations || [];
    expect(orders.filter((x) => x === 'ecg').length).toBe(1);
  });

  it('toggles differential diagnosis hypotheses', () => {
    useTrainingStore.getState().init(caseId);

    useTrainingStore.getState().toggleDifferential('I20.0');
    expect(useTrainingStore.getState().session?.differentials).toContain('I20.0');

    useTrainingStore.getState().toggleDifferential('I20.0');
    expect(useTrainingStore.getState().session?.differentials).not.toContain('I20.0');
  });

  it('sets final diagnosis, reasoning and management notes', () => {
    useTrainingStore.getState().init(caseId);

    useTrainingStore.getState().setFinal('I20.0');
    useTrainingStore.getState().setReasoning('Пациент испытывает давящую боль за грудиной.');
    useTrainingStore.getState().setManagement('Срочная ЭКГ, тропонин, покой.');

    const session = useTrainingStore.getState().session;
    expect(session?.finalDiagnosis).toBe('I20.0');
    expect(session?.clinicalReasoning).toContain('давящую боль');
    expect(session?.managementNotes).toContain('Срочная ЭКГ');
  });
});
