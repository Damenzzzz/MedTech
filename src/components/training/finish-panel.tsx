'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface FinishPanelProps {
  patient: StudentCaseDTO;
  onFinishSession: () => Promise<void>;
}

export function FinishPanel({ patient, onFinishSession }: FinishPanelProps) {
  const t = useTranslations('Training');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await onFinishSession();
    } catch {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 justify-between">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
          <Award size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Завершение клинического приёма
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Подведение итогов и переход к Debrief
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 space-y-4 shadow-sm my-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-800 shadow-xs">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>Клинический цикл завершён</span>
        </div>

        <h4 className="text-base font-bold text-slate-900 leading-snug">
          Вы готовы отправить решение на автоматический клиника-диагностический разбор.
        </h4>

        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          {t('finishHint')}
        </p>

        <div className="space-y-2 pt-2 border-t border-teal-200/60 text-xs font-semibold text-teal-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Оценка 8 клинических компетенций</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Анализ пропущенных вопросов и красных флагов</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Сравнение с эталоном (Ground Truth)</span>
          </div>
        </div>
      </div>

      {/* Big Finish Button */}
      <button
        onClick={handleFinish}
        disabled={isFinishing}
        className="focus-ring w-full rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isFinishing ? (
          <span>Формирование разбора...</span>
        ) : (
          <>
            <span>{t('finish')}</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}
