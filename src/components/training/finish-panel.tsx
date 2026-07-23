'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { StudentCaseDTO, TrainingSession } from '@/domain/schemas';

interface FinishPanelProps {
  patient: StudentCaseDTO;
  session: TrainingSession | null;
  onFinishSession: () => Promise<void>;
  onSelectStage: (stageIndex: number) => void;
}

export function FinishPanel({
  patient: _patient,
  session,
  onFinishSession,
  onSelectStage,
}: FinishPanelProps) {
  const t = useTranslations('Training');
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasDialogue = Boolean(session?.dialogue && session.dialogue.length > 0);
  const hasExams = Boolean(session?.performedExaminations && session.performedExaminations.length > 0);
  const hasTests = Boolean(session?.selectedInvestigations && session.selectedInvestigations.length > 0);
  const hasDiffs = Boolean(session?.differentials && session.differentials.length > 0);
  const hasFinal = Boolean(session?.finalDiagnosis);
  const hasReasoning = Boolean(session?.clinicalReasoning && session.clinicalReasoning.trim().length >= 20);

  const missingSections: { label: string; stageIdx: number }[] = [];

  if (!hasFinal) {
    missingSections.push({ label: t('final'), stageIdx: 4 });
  }
  if (!hasReasoning) {
    missingSections.push({ label: t('reasoning'), stageIdx: 4 });
  }

  const handleFinish = async () => {
    if (missingSections.length > 0) {
      setErrorMessage(t('leaveText'));
      return;
    }

    setIsFinishing(true);
    setErrorMessage(null);

    try {
      await onFinishSession();
    } catch {
      setIsFinishing(false);
      setErrorMessage(t('leaveText'));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#D2F1EC] text-[#0E7D72]">
          <Award size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('finish')}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            {t('finishHint')}
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 font-medium leading-relaxed">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{t('finish')}</p>
              <p className="mt-0.5 text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Missing Required Sections Warning */}
        {missingSections.length > 0 && !errorMessage && (
          <div className="rounded-2xl border border-[#F3CA8D] bg-[#FDF3E7] p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#6B4414] font-bold">
              <AlertCircle size={16} className="text-[#C77A1E]" />
              <span>{t('leaveTitle')}</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-[#4A2F0E] font-medium">
              {missingSections.map((sec) => (
                <li key={sec.label}>
                  <button
                    onClick={() => onSelectStage(sec.stageIdx)}
                    className="underline text-[#6B4414] hover:text-[#4A2F0E] font-bold text-left"
                  >
                    {sec.label} (→)
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stages Readiness Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('stage')}:
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs font-semibold">
            <div className={`flex items-center justify-between p-2 rounded-xl border ${hasDialogue ? 'bg-[#EAF9F7]/70 border-[#A6E3DA] text-[#084D47]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span>1. {t('stages.1')} ({session?.dialogue?.length || 0})</span>
              {hasDialogue ? <CheckCircle2 size={16} className="text-[#0E9E92]" /> : <span className="text-[11px]">0</span>}
            </div>

            <div className={`flex items-center justify-between p-2 rounded-xl border ${hasExams ? 'bg-[#EAF9F7]/70 border-[#A6E3DA] text-[#084D47]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span>2. {t('stages.2')} ({session?.performedExaminations?.length || 0})</span>
              {hasExams ? <CheckCircle2 size={16} className="text-[#0E9E92]" /> : <span className="text-[11px]">0</span>}
            </div>

            <div className={`flex items-center justify-between p-2 rounded-xl border ${hasTests ? 'bg-[#EAF9F7]/70 border-[#A6E3DA] text-[#084D47]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span>3. {t('stages.3')} ({session?.selectedInvestigations?.length || 0})</span>
              {hasTests ? <CheckCircle2 size={16} className="text-[#0E9E92]" /> : <span className="text-[11px]">0</span>}
            </div>

            <div className={`flex items-center justify-between p-2 rounded-xl border ${hasDiffs ? 'bg-[#EAF9F7]/70 border-[#A6E3DA] text-[#084D47]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span>4. {t('stages.4')} ({session?.differentials?.length || 0})</span>
              {hasDiffs ? <CheckCircle2 size={16} className="text-[#0E9E92]" /> : <span className="text-[11px]">0</span>}
            </div>

            <div className={`flex items-center justify-between p-2 rounded-xl border ${hasFinal && hasReasoning ? 'bg-[#EAF9F7]/70 border-[#A6E3DA] text-[#084D47]' : 'bg-[#FDF3E7] border-[#F3CA8D] text-[#6B4414]'}`}>
              <span>5. {t('final')}</span>
              {hasFinal && hasReasoning ? <CheckCircle2 size={16} className="text-[#0E9E92]" /> : <AlertTriangle size={16} className="text-[#C77A1E]" />}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-2xl border border-[#AFCBFB] bg-gradient-to-br from-[#EAF2FE] to-[#EAF9F7] p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#0D3A73] font-bold text-xs">
            <ShieldCheck size={16} className="text-[#1F6FEB]" />
            <span>{t('finish')}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {t('finishHint')}
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleFinish}
        disabled={isFinishing}
        className="focus-ring w-full rounded-2xl bg-[#0E9E92] py-3.5 text-xs font-bold text-white shadow-md shadow-[#0E9E92]/30 hover:bg-[#0E7D72] disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-auto"
      >
        {isFinishing ? (
          <span>...</span>
        ) : (
          <>
            <span>{t('finish')}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
