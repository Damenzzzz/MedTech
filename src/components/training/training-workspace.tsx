'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PatientVisualState, StudentCaseDTO } from '@/domain/schemas';
import { PatientMessageResultSchema } from '@/engines/patient-engine';
import { useTrainingStore } from '@/stores/training-store';
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
    try {
      localStorage.setItem(`kms-debrief-${patient.id}`, JSON.stringify(resultData));

      let progress: Record<string, unknown>[] = [];
      try {
        progress = JSON.parse(localStorage.getItem('kms-progress') ?? '[]');
        if (!Array.isArray(progress)) progress = [];
      } catch {
        progress = [];
      }

      const filtered = progress.filter((p) => p && p.sessionId !== session.id);
      const newEntry = {
        caseId: patient.id,
        sessionId: session.id,
        completedAt: Date.now(),
        score: resultData.total ?? 0,
        categories: resultData.categories ?? {},
        specialty: patient.specialty,
        validationTier: patient.validationTier,
        missedRedFlags: resultData.missedRedFlags ?? [],
        criticalErrors: resultData.criticalErrors ?? [],
      };

      localStorage.setItem('kms-progress', JSON.stringify([...filtered, newEntry].slice(-50)));
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
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col font-sans">
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
      <div className="flex-1 flex flex-col xl:flex-row min-h-[calc(100vh-4rem)]">
        {/* Stage Navigation */}
        <StageNavigation
          currentStage={currentStage}
          onSelectStage={(idx) => setStage(idx)}
        />

        {/* Center: Patient Visual Stage */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-200/80">
          <PatientStage
            patient={patient}
            visualState={visualState}
            latestAnswer={latestPatientMessage?.text}
            isThinking={isThinking}
            locale={locale}
          />
        </div>

        {/* Right Side: Active Stage Medical Panel */}
        <aside className="w-full xl:w-[440px] bg-white p-4 sm:p-6 flex flex-col justify-between shrink-0 shadow-xs">
          {/* Stage 0: Patient Chart Overview */}
          {currentStage === 0 && (
            <div className="space-y-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t('stages.0')}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    {t('patientState')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  {t('queue')}:
                </p>
                <p className="text-xs font-semibold text-teal-950 leading-relaxed">
                  {typeof patient.complaint === 'object' ? patient.complaint.ru : patient.complaint}
                </p>
              </div>

              <button
                onClick={handleNextStage}
                className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all flex items-center justify-center gap-1.5"
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
        </aside>
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
