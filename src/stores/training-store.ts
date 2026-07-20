'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TrainingSession,
  StudentAction,
  DialogueMessage,
  PerformedExamination,
  OrderedInvestigation,
  PatientVisualState,
} from '@/domain/schemas';

const freshSession = (caseId: string): TrainingSession => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`,
  caseId,
  startedAt: Date.now(),
  stage: 0,
  revealedFactIds: [],
  actions: [],
  dialogue: [],
  performedExaminations: [],
  orderedInvestigations: [],
  selectedInvestigations: [],
  differentials: [],
  clinicalReasoning: '',
  managementNotes: '',
});

interface TrainingStore {
  session: TrainingSession | null;
  init: (caseId: string) => void;
  setStage: (stage: number) => void;
  addAction: (type: StudentAction['type'], value: string) => void;
  addStudentMessage: (text: string) => string;
  addPatientMessage: (text: string, visualState?: PatientVisualState) => string;
  replaceFailedMessage: (failedId: string, newText: string) => void;
  clearDialogue: () => void;
  reveal: (ids: string[]) => void;

  // Examinations
  addPerformedExamination: (id: string, result: string, performedAt?: number) => void;

  // Investigations
  addOrderedInvestigation: (
    id: string,
    result: string,
    delayMs: number,
    orderedAt?: number
  ) => void;
  updateInvestigationStatus: (id: string, status: 'pending' | 'ready' | 'failed') => void;
  orderTest: (id: string) => void;

  toggleDifferential: (code: string) => void;
  setFinal: (code: string) => void;
  setReasoning: (value: string) => void;
  setManagement: (value: string) => void;
  reset: (caseId: string) => void;
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set) => ({
      session: null,

      init: (caseId) =>
        set((s) => {
          if (s.session?.caseId === caseId) {
            // Ensure backwards compatibility with old sessions missing array fields
            return {
              session: {
                ...s.session,
                dialogue: s.session.dialogue || [],
                performedExaminations: s.session.performedExaminations || [],
                orderedInvestigations: s.session.orderedInvestigations || [],
              },
            };
          }
          return { session: freshSession(caseId) };
        }),

      setStage: (stage) =>
        set((s) => (s.session ? { session: { ...s.session, stage } } : s)),

      addAction: (type, value) =>
        set((s) => {
          if (!s.session) return s;
          const actionId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `act-${Date.now()}-${Math.random()}`;
          return {
            session: {
              ...s.session,
              actions: [
                ...s.session.actions,
                { id: actionId, type, value, timestamp: Date.now() },
              ],
            },
          };
        }),

      addStudentMessage: (text) => {
        const msgId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `msg-${Date.now()}-${Math.random()}`;

        set((s) => {
          if (!s.session) return s;
          const msg: DialogueMessage = {
            id: msgId,
            role: 'student',
            text,
            timestamp: Date.now(),
          };
          return {
            session: {
              ...s.session,
              dialogue: [...(s.session.dialogue || []), msg],
            },
          };
        });

        return msgId;
      },

      addPatientMessage: (text, visualState) => {
        const msgId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `msg-${Date.now()}-${Math.random()}`;

        set((s) => {
          if (!s.session) return s;
          const msg: DialogueMessage = {
            id: msgId,
            role: 'patient',
            text,
            timestamp: Date.now(),
            visualState,
          };
          return {
            session: {
              ...s.session,
              dialogue: [...(s.session.dialogue || []), msg],
            },
          };
        });

        return msgId;
      },

      replaceFailedMessage: (failedId, newText) =>
        set((s) => {
          if (!s.session) return s;
          const updatedDialogue = (s.session.dialogue || []).map((m) =>
            m.id === failedId ? { ...m, text: newText } : m
          );
          return { session: { ...s.session, dialogue: updatedDialogue } };
        }),

      clearDialogue: () =>
        set((s) => (s.session ? { session: { ...s.session, dialogue: [] } } : s)),

      reveal: (ids) =>
        set((s) =>
          s.session
            ? {
                session: {
                  ...s.session,
                  revealedFactIds: Array.from(
                    new Set([...s.session.revealedFactIds, ...ids])
                  ),
                },
              }
            : s
        ),

      addPerformedExamination: (id, result, performedAt = Date.now()) =>
        set((s) => {
          if (!s.session) return s;
          const existing = s.session.performedExaminations || [];
          if (existing.some((e) => e.id === id)) return s;

          const item: PerformedExamination = { id, result, performedAt };
          return {
            session: {
              ...s.session,
              performedExaminations: [...existing, item],
            },
          };
        }),

      addOrderedInvestigation: (
        id,
        result,
        delayMs,
        orderedAt = Date.now()
      ) =>
        set((s) => {
          if (!s.session) return s;
          const existing = s.session.orderedInvestigations || [];
          if (existing.some((inv) => inv.id === id)) return s;

          const readyAt = orderedAt + delayMs;
          const status = delayMs <= 0 ? 'ready' : 'pending';

          const item: OrderedInvestigation = {
            id,
            orderedAt,
            readyAt,
            result,
            status,
          };

          return {
            session: {
              ...s.session,
              selectedInvestigations: Array.from(
                new Set([...s.session.selectedInvestigations, id])
              ),
              orderedInvestigations: [...existing, item],
            },
          };
        }),

      updateInvestigationStatus: (id, status) =>
        set((s) => {
          if (!s.session) return s;
          const updated = (s.session.orderedInvestigations || []).map((inv) =>
            inv.id === id ? { ...inv, status } : inv
          );
          return { session: { ...s.session, orderedInvestigations: updated } };
        }),

      orderTest: (id) =>
        set((s) =>
          s.session && !s.session.selectedInvestigations.includes(id)
            ? {
                session: {
                  ...s.session,
                  selectedInvestigations: [...s.session.selectedInvestigations, id],
                },
              }
            : s
        ),

      toggleDifferential: (code) =>
        set((s) =>
          s.session
            ? {
                session: {
                  ...s.session,
                  differentials: s.session.differentials.includes(code)
                    ? s.session.differentials.filter((x) => x !== code)
                    : [...s.session.differentials, code],
                },
              }
            : s
        ),

      setFinal: (finalDiagnosis) =>
        set((s) => (s.session ? { session: { ...s.session, finalDiagnosis } } : s)),

      setReasoning: (clinicalReasoning) =>
        set((s) => (s.session ? { session: { ...s.session, clinicalReasoning } } : s)),

      setManagement: (managementNotes) =>
        set((s) => (s.session ? { session: { ...s.session, managementNotes } } : s)),

      reset: (caseId) => set({ session: freshSession(caseId) }),
    }),
    {
      name: 'kms-training',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
