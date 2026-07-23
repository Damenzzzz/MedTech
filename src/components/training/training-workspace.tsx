'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PatientVisualState, StudentCaseDTO } from '@/domain/schemas';
import { PatientMessageResultSchema } from '@/engines/patient-engine';
import { useTrainingStore } from '@/stores/training-store';
import { saveProgressEntry } from '@/lib/progress';
import { useRouter } from '@/i18n/navigation';

import { TrainingHeader } from './training-header';
import { StageNavigation } from './stage-navigation';
import { PatientStage } from './patient-stage';
import { ConversationPanel } from './conversation-panel';
import { ExaminationPanel } from './examination-panel';
import { InvestigationPanel } from './investigation-panel';
import { DifferentialPanel } from './differential-panel';
import { DiagnosisPanel } from './diagnosis-panel';
import { ManagementPanel } from './management-panel';
import { FinishPanel } from './finish-panel';
import { LeaveDialog } from './leave-dialog';
import { CommandPalette } from './command-palette';
import { ClipboardList, ArrowRight } from 'lucide-react';

export function TrainingWorkspace({ patient }: { patient: StudentCaseDTO }) {
  const locale = useLocale() as 'ru' | 'kk' | 'en';
  const t = useTranslations('Training');
  const router = useRouter();

  // Use stable selectors to avoid re-renders on unrelated state changes
  const session = useTrainingStore((s) => s.session);
  const init = useTrainingStore((s) => s.init);
  const addStudentMessage = useTrainingStore((s) => s.addStudentMessage);
  const addPatientMessage = useTrainingStore((s) => s.addPatientMessage);
  const addAction = useTrainingStore((s) => s.addAction);
  const reveal = useTrainingStore((s) => s.reveal);
  const setStage = useTrainingStore((s) => s.setStage);
  const addPerformedExamination = useTrainingStore((s) => s.addPerformedExamination);
  const addOrderedInvestigation = useTrainingStore((s) => s.addOrderedInvestigation);
  const updateInvestigationStatus = useTrainingStore((s) => s.updateInvestigationStatus);
  const setManagement = useTrainingStore((s) => s.setManagement);
  const selectManagementOption = useTrainingStore((s) => s.selectManagementOption);
  const toggleDifferential = useTrainingStore((s) => s.toggleDifferential);
  const setFinal = useTrainingStore((s) => s.setFinal);
  const setReasoning = useTrainingStore((s) => s.setReasoning);

  const [visualState, setVisualState] = useState<PatientVisualState>('neutral');
  const [isThinking, setIsThinking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Initialize store session — init is a stable reference from Zustand
  useEffect(() => {
    init(patient.id);
  }, [patient.id, init]);

  // Timer countdown / elapsed
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.startedAt, session]);

  // Shortcut key listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentStage = session?.stage ?? 0;

  // Ask question logic calling /api/session/respond
  const handleAskQuestion = async (question: string) => {
    if (!session || !question.trim() || isThinking) return;

    addStudentMessage(question);
    addAction('question', question);
    setIsThinking(true);
    setHasError(false);
    setVisualState('thinking');

    const fullHistory = (session.dialogue || []).map((d) => ({
      role: d.role,
      text: d.text,
    }));
    fullHistory.push({ role: 'student', text: question });

    const controller = new AbortController();

    try {
      const response = await fetch('/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: patient.id,
          message: question,
          locale,
          revealedFactIds: session.revealedFactIds,
          dialogue: fullHistory.slice(-15),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = PatientMessageResultSchema.parse(await response.json());
      addPatientMessage(result.answer, result.visualState);
      reveal(result.newFactIds);
      setVisualState(result.visualState);
    } catch {
      setHasError(true);
      setVisualState('neutral');
    } finally {
      setIsThinking(false);
    }
  };

  const handleRetryQuestion = async () => {
    const dialogue = session?.dialogue || [];
    const lastStudentMsg = [...dialogue].reverse().find((m) => m.role === 'student');
    if (!lastStudentMsg || isThinking) return;

    setIsThinking(true);
    setHasError(false);
    setVisualState('thinking');

    const fullHistory = dialogue.map((d) => ({
      role: d.role,
      text: d.text,
    }));

    try {
      const response = await fetch('/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: patient.id,
          message: lastStudentMsg.text,
          locale,
          revealedFactIds: session?.revealedFactIds || [],
          dialogue: fullHistory.slice(-15),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = PatientMessageResultSchema.parse(await response.json());
      addPatientMessage(result.answer, result.visualState);
      reveal(result.newFactIds);
      setVisualState(result.visualState);
    } catch {
      setHasError(true);
      setVisualState('neutral');
    } finally {
      setIsThinking(false);
    }
  };

  // Perform physical examination
  const handlePerformExam = async (examId: string, result: string) => {
    if (!session) return;
    addPerformedExamination(examId, result);
    addAction('examination', examId);
  };

  // Order investigation
  const handleOrderTest = async (testId: string, result: string, delayMs: number) => {
    if (!session) return;
    addOrderedInvestigation(testId, result, delayMs);
    addAction('investigation', testId);
  };

  // Append management item
  const handleAppendManagementItem = (val: string, optionId?: string) => {
    if (!session) return;
    if (optionId) {
      selectManagementOption(optionId);
    }
    const next = session.managementNotes
      ? `${session.managementNotes}\n• ${val}`
      : `• ${val}`;
    setManagement(next);
    addAction('management', val);
  };

  // Finish session & trigger /api/session/debrief
  const handleFinishSession = async () => {
    if (!session) return;
    addAction('management', session.managementNotes);

    const response = await fetch('/api/session/debrief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...session, completedAt: Date.now() }),
    });

    if (!response.ok) {
      throw new Error('debrief_failed');
    }

    const resultData = await response.json();

    // Record progress before navigating: scoring is deterministic and RAG sources
    // are fetched lazily on the debrief screen, so this never waits on the network.
    saveProgressEntry({
      caseId: patient.id,
      sessionId: session.id,
      completedAt: Date.now(),
      score: resultData.total ?? 0,
      categories: resultData.categories ?? {},
      specialty: patient.specialty,
      validationTier: patient.validationTier,
      missedRedFlags: resultData.missedRedFlags ?? [],
      criticalErrors: resultData.criticalErrors ?? [],
    });

    try {
      localStorage.setItem(`kms-debrief-${patient.id}`, JSON.stringify(resultData));
    } catch {
      // Safe fallback if localStorage fails
    }

    router.push(`/debrief/${patient.id}`);
  };

  const handleNextStage = () => {
    setStage(Math.min(7, currentStage + 1));
  };

  // Extract latest patient message text for PatientStage bubble
  const patientDialogue = session?.dialogue || [];
  const latestPatientMessage = [...patientDialogue].reverse().find((m) => m.role === 'patient');

  return (
    <div className="spatial-bg min-h-screen flex flex-col font-sans">
      {/* Clinical Header */}
      <TrainingHeader
        patient={patient}
        elapsedSeconds={elapsed}
        currentStage={currentStage}
        totalStages={8}
        onOpenLeave={() => setLeaveOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 p-4 sm:p-6 min-[1041px]:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left: Patient Snapshot */}
        <div className="min-[1041px]:order-1">
          <PatientStage
            patient={patient}
            visualState={visualState}
            latestAnswer={latestPatientMessage?.text}
            isThinking={isThinking}
            locale={locale}
          />
        </div>

        {/* Right: Cardio monitor + stage timeline + active panel */}
        <div className="flex min-w-0 flex-col gap-3.5 min-[1041px]:order-2">
          <div
            className="relative overflow-hidden rounded-3xl px-4.5 py-4"
            style={{ background: 'linear-gradient(120deg,#12324F,#1F6FEB)' }}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-12 size-[200px] rounded-full"
              style={{ background: 'radial-gradient(circle,rgba(18,181,166,0.4),transparent 62%)' }}
            />
            <div className="relative z-[2] flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white/85">Кардиомониторинг · в реальном времени</span>
              <span className="mono rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white">II отв.</span>
            </div>
            <svg viewBox="0 0 900 60" preserveAspectRatio="none" className="relative z-[2] mt-2 block h-11 w-full">
              <polyline
                points="0,30 90,30 120,30 132,10 146,52 160,30 250,30 300,30 312,22 326,38 340,30 430,30 470,30 482,6 498,56 512,30 610,30 660,30 672,22 686,38 700,30 800,30 860,30 872,10 886,52 900,30"
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ strokeDasharray: 900, animation: 'ecgDash 3s linear infinite' }}
              />
            </svg>
          </div>

          <StageNavigation currentStage={currentStage} onSelectStage={(idx) => setStage(idx)} />

          {/* Active Stage Medical Panel */}
          <div className="flex flex-1 flex-col justify-between rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_32px_-16px_rgba(16,32,43,0.2)] sm:p-5">
          {/* Stage 0: Patient Chart Overview */}
          {currentStage === 0 && (
            <div className="space-y-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[#D6E5FD] text-[#1A5FD0]">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {t('stages.0')}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                    {t('patientState')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#AFCBFB] bg-[#EAF2FE]/70 p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#124F8C]">
                  {t('queue')}:
                </p>
                <p className="text-xs font-semibold text-[#0B1C33] leading-relaxed">
                  {typeof patient.complaint === 'object' ? patient.complaint.ru : patient.complaint}
                </p>
              </div>

              <button
                onClick={handleNextStage}
                className="focus-ring mt-auto w-full rounded-xl bg-[#1F6FEB] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#1A5FD0] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{t('start')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Stage 1: Conversation Panel */}
          {currentStage === 1 && (
            <ConversationPanel
              patient={patient}
              dialogue={session?.dialogue || []}
              revealedFactCount={session?.revealedFactIds.length || 0}
              onAskQuestion={handleAskQuestion}
              isThinking={isThinking}
              hasError={hasError}
              onRetry={handleRetryQuestion}
              onNextStage={handleNextStage}
            />
          )}

          {/* Stage 2: Examination Panel */}
          {currentStage === 2 && (
            <ExaminationPanel
              patient={patient}
              performedExaminations={session?.performedExaminations || []}
              onPerformExam={handlePerformExam}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 3: Investigation Panel */}
          {currentStage === 3 && (
            <InvestigationPanel
              patient={patient}
              orderedInvestigations={session?.orderedInvestigations || []}
              onOrderTest={handleOrderTest}
              onUpdateStatus={(id, status) => updateInvestigationStatus(id, status)}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 4: Differential Panel */}
          {currentStage === 4 && (
            <DifferentialPanel
              patient={patient}
              selectedDifferentials={session?.differentials || []}
              onToggleDifferential={(code) => {
                toggleDifferential(code);
                addAction('differential', code);
              }}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 5: Diagnosis Panel */}
          {currentStage === 5 && (
            <DiagnosisPanel
              patient={patient}
              finalDiagnosis={session?.finalDiagnosis}
              onSetFinalDiagnosis={(code) => {
                setFinal(code);
                addAction('diagnosis', code);
              }}
              reasoning={session?.clinicalReasoning || ''}
              onSetReasoning={(val) => setReasoning(val)}
              selectedDifferentials={session?.differentials || []}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 6: Management Panel */}
          {currentStage === 6 && (
            <ManagementPanel
              patient={patient}
              managementNotes={session?.managementNotes || ''}
              onSetManagementNotes={(notes) => setManagement(notes)}
              onAppendNoteItem={handleAppendManagementItem}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 7: Finish Panel */}
          {currentStage === 7 && (
            <FinishPanel
              patient={patient}
              session={session}
              onFinishSession={handleFinishSession}
              onSelectStage={(idx) => setStage(idx)}
            />
          )}
          </div>
        </div>
      </div>

      {/* Leave Modal & Command Palette */}
      <LeaveDialog isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        currentStage={currentStage}
        onSelectStage={(idx) => setStage(idx)}
      />
    </div>
  );
}
