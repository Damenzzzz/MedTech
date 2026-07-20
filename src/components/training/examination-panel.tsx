'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Stethoscope, CheckCircle2, HeartPulse, Thermometer, Activity, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StudentCaseDTO, PerformedExamination } from '@/domain/schemas';

interface ExaminationPanelProps {
  patient: StudentCaseDTO;
  performedExaminations: PerformedExamination[];
  onPerformExam: (examId: string, result: string) => Promise<void>;
  onNextStage: () => void;
  locale: string;
}

export function ExaminationPanel({
  patient,
  performedExaminations,
  onPerformExam,
  onNextStage,
  locale,
}: ExaminationPanelProps) {
  const t = useTranslations('Training');
  const c = useTranslations('Common');
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePerform = async (examId: string) => {
    const existing = performedExaminations.find((e) => e.id === examId);
    if (existing) return;

    setLoadingExamId(examId);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/session/examinations/perform', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: patient.id,
          examinationId: examId,
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error('perform_failed');
      }

      const data = await res.json();
      await onPerformExam(examId, data.result);
    } catch {
      setErrorMessage(`Ошибка выполнения физикального осмотра (${examId}). Попробуйте ещё раз.`);
    } finally {
      setLoadingExamId(null);
    }
  };

  const vitals = patient.vitals;

  const getHeartRateColor = (hr: number) => (hr < 60 || hr > 100 ? 'text-amber-600' : 'text-slate-900');
  const getSpo2Color = (spo2: number) => (spo2 < 95 ? 'text-red-600 font-bold' : 'text-slate-900');
  const getTempColor = (temp: number) => (temp >= 38 ? 'text-amber-600 font-bold' : 'text-slate-900');

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-cyan-100 text-cyan-700">
          <Stethoscope size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Физикальный осмотр
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Жизненные показатели и объективный статус
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="flex items-center gap-1 font-bold text-red-700 hover:underline"
          >
            <RotateCcw size={13} />
            <span>{c('retry')}</span>
          </button>
        </div>
      )}

      {/* Medical Vital Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>ЧСС</span>
            <HeartPulse size={14} className="text-teal-600" />
          </div>
          <div className={`mt-1 text-lg font-black ${getHeartRateColor(vitals.heartRate)}`}>
            {vitals.heartRate} <span className="text-[10px] font-normal text-slate-500">уд/мин</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>АД</span>
            <Activity size={14} className="text-teal-600" />
          </div>
          <div className="mt-1 text-base font-black text-slate-900">
            {vitals.bloodPressure} <span className="text-[10px] font-normal text-slate-500">мм рт.ст.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>SpO₂</span>
            <span className="text-[10px] font-bold text-teal-600">%</span>
          </div>
          <div className={`mt-1 text-lg font-black ${getSpo2Color(vitals.spo2)}`}>
            {vitals.spo2}%
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>ЧДД</span>
            <Activity size={14} className="text-cyan-600" />
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {vitals.respiratoryRate} <span className="text-[10px] font-normal text-slate-500">в мин</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Темп.</span>
            <Thermometer size={14} className="text-amber-600" />
          </div>
          <div className={`mt-1 text-lg font-black ${getTempColor(vitals.temperature)}`}>
            {vitals.temperature}°C
          </div>
        </div>

        {vitals.glucose !== undefined && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Глюкоза</span>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {vitals.glucose} <span className="text-[10px] font-normal text-slate-500">ммоль/л</span>
            </div>
          </div>
        )}
      </div>

      {/* Examinations Accordion List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Методы физикального обследования:
        </p>

        {patient.examinations.map((exam) => {
          const performedEntry = performedExaminations.find((e) => e.id === exam.id);
          const isDone = Boolean(performedEntry);
          const isLoading = loadingExamId === exam.id;

          const label =
            typeof exam.label === 'object'
              ? exam.label[locale as 'ru' | 'kk' | 'en'] || exam.label.ru
              : exam.label;

          return (
            <div
              key={exam.id}
              className={`rounded-2xl border p-4 transition-all ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">
                  {label}
                </span>

                <button
                  onClick={() => handlePerform(exam.id)}
                  disabled={isDone || isLoading}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{t('performed')}</span>
                    </>
                  ) : isLoading ? (
                    <span>Выполняется...</span>
                  ) : (
                    <span>{t('perform')}</span>
                  )}
                </button>
              </div>

              {/* Skeleton or Result Fade Reveal */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 pt-3 border-t border-slate-200/60 animate-pulse space-y-1.5"
                  >
                    <div className="h-3 w-3/4 bg-slate-200 rounded-md" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded-md" />
                  </motion.div>
                )}

                {isDone && performedEntry && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-emerald-200/80 text-xs font-medium text-slate-800 leading-relaxed"
                  >
                    <p className="font-semibold text-emerald-950">Результат осмотра:</p>
                    <p className="mt-1">{performedEntry.result}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к исследованиям →
      </button>
    </div>
  );
}
