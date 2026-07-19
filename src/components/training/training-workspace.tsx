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
  const t = useTranslations('Training');
  const locale = useLocale() as 'ru' | 'kk' | 'en';
  const router = useRouter();

  const store = useTrainingStore();
  const session = store.session;

  const [visualState, setVisualState] = useState<PatientVisualState>('neutral');
  const [isThinking, setIsThinking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [latestPatientAnswer, setLatestPatientAnswer] = useState<string>('');

  // Initialize store session
  useEffect(() => {
    store.init(patient.id);
  }, [patient.id, store]);

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
    if (!session || !question.trim()) return;

    store.addAction('question', question);
    setIsThinking(true);
    setHasError(false);
    setVisualState('thinking');

    try {
      const response = await fetch('/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: patient.id,
          message: question,
          locale,
          revealedFactIds: session.revealedFactIds,
          dialogue: [{ role: 'student', text: question }],
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const result = PatientMessageResultSchema.parse(await response.json());
      store.reveal(result.newFactIds);
      setVisualState(result.visualState);
      setLatestPatientAnswer(result.answer);
    } catch {
      setHasError(true);
      setVisualState('neutral');
    } finally {
      setIsThinking(false);
    }
  };

  // Order investigation
  const handleOrderTest = (testId: string, delayMs: number) => {
    if (!session || session.selectedInvestigations.includes(testId)) return;
    store.orderTest(testId);
    store.addAction('investigation', testId);
  };

  // Perform physical examination
  const handlePerformExam = (examId: string) => {
    if (!session) return;
    store.addAction('examination', examId);
  };

  // Append management item
  const handleAppendManagementItem = (val: string) => {
    if (!session) return;
    const next = session.managementNotes
      ? `${session.managementNotes}\n• ${val}`
      : `• ${val}`;
    store.setManagement(next);
    store.addAction('management', val);
  };

  // Finish session & trigger /api/session/debrief
  const handleFinishSession = async () => {
    if (!session) return;
    store.addAction('management', session.managementNotes);

    const response = await fetch('/api/session/debrief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...session, completedAt: Date.now() }),
    });

    if (response.ok) {
      const resultData = await response.json();
      localStorage.setItem(`kms-debrief-${patient.id}`, JSON.stringify(resultData));

      const progress = JSON.parse(localStorage.getItem('kms-progress') ?? '[]') as unknown[];
      localStorage.setItem(
        'kms-progress',
        JSON.stringify([...progress, { caseId: patient.id, date: new Date().toISOString() }].slice(-20))
      );

      router.push(`/debrief/${patient.id}`);
    }
  };

  const handleNextStage = () => {
    store.setStage(Math.min(7, currentStage + 1));
  };

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
          onSelectStage={(idx) => store.setStage(idx)}
        />

        {/* Center: Patient Visual Stage */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-200/80">
          <PatientStage
            patient={patient}
            visualState={visualState}
            latestAnswer={latestPatientAnswer}
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
                    Карта пациента
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Первичный клинический обзор
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Первичная жалоба:
                </p>
                <p className="text-xs font-semibold text-teal-950 leading-relaxed">
                  {typeof patient.complaint === 'object' ? patient.complaint.ru : patient.complaint}
                </p>
              </div>

              <button
                onClick={handleNextStage}
                className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Начать беседу с пациентом</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Stage 1: Conversation Panel */}
          {currentStage === 1 && (
            <ConversationPanel
              patient={patient}
              revealedFactCount={session?.revealedFactIds.length || 0}
              onAskQuestion={handleAskQuestion}
              isThinking={isThinking}
              hasError={hasError}
              onRetry={() => handleAskQuestion('Повторите жалоба')}
              onNextStage={handleNextStage}
            />
          )}

          {/* Stage 2: Examination Panel */}
          {currentStage === 2 && (
            <ExaminationPanel
              patient={patient}
              performedExamIds={
                session?.actions
                  .filter((a) => a.type === 'examination')
                  .map((a) => a.value) || []
              }
              onPerformExam={handlePerformExam}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 3: Investigation Panel */}
          {currentStage === 3 && (
            <InvestigationPanel
              patient={patient}
              orderedIds={session?.selectedInvestigations || []}
              onOrderTest={handleOrderTest}
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
                store.toggleDifferential(code);
                store.addAction('differential', code);
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
                store.setFinal(code);
                store.addAction('diagnosis', code);
              }}
              reasoning={session?.clinicalReasoning || ''}
              onSetReasoning={(val) => store.setReasoning(val)}
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
              onSetManagementNotes={(notes) => store.setManagement(notes)}
              onAppendNoteItem={handleAppendManagementItem}
              onNextStage={handleNextStage}
              locale={locale}
            />
          )}

          {/* Stage 7: Finish Panel */}
          {currentStage === 7 && (
            <FinishPanel
              patient={patient}
              onFinishSession={handleFinishSession}
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
        onSelectStage={(idx) => store.setStage(idx)}
      />
    </div>
  );
}
