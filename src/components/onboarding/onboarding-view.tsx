'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Stethoscope,
  TestTube,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

export function OnboardingView() {
  const t = useTranslations('Onboarding');
  const router = useRouter();

  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);
  const setOnboardingStepStore = useUserStore((s) => s.setOnboardingStep);
  const setOnboardingCompleted = useUserStore((s) => s.setOnboardingCompleted);

  const initialStep = profile?.onboardingStep ?? 0;
  const [step, setStep] = useState<number>(initialStep);

  // Step 1 interactive state
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  // Step 2 interactive state
  const [examDone, setExamDone] = useState<boolean>(false);

  // Step 3 interactive state
  const [selectedTest, setSelectedTest] = useState<'useful' | 'extra' | null>(null);

  const totalSteps = 4;

  useEffect(() => {
    setOnboardingStepStore(step);
  }, [step, setOnboardingStepStore]);

  const finishOnboarding = useCallback(() => {
    setOnboardingCompleted(true);
    setOnboardingStepStore(3);
    router.push('/patients');
  }, [setOnboardingCompleted, setOnboardingStepStore, router]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && step < totalSteps - 1) {
        setStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep((s) => s - 1);
      } else if (e.key === 'Escape') {
        finishOnboarding();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, finishOnboarding]);

  const userName = (hydrated && profile?.name) ? profile.name : 'Коллега';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Top Bar: Progress & Step Info */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-teal-100 text-teal-700">
              <Sparkles size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              {t('stepCount', { current: step + 1, total: totalSteps })}
            </span>
          </div>

          <button
            onClick={finishOnboarding}
            className="focus-ring text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            {t('skip')} ✕
          </button>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-xs"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main Step Card Slider */}
      <div className="relative min-h-[440px] rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: History Taking */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    1. {t('step1Title')}
                  </h2>
                  <p className="text-xs font-semibold text-teal-700">
                    Анамнез · Диалог с виртуальным пациентом
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                {t('step1Desc')}
              </p>

              {/* Interactive Dialogue Practice */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-xs font-bold text-slate-700">
                  {t('step1QuestionLabel')}
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => setSelectedQuestion(1)}
                    className={`focus-ring text-left rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                      selectedQuestion === 1
                        ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    1. {t('step1Q1')}
                  </button>

                  <button
                    onClick={() => setSelectedQuestion(2)}
                    className={`focus-ring text-left rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                      selectedQuestion === 2
                        ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    2. {t('step1Q2')}
                  </button>
                </div>

                {/* Patient Response Bubble */}
                <AnimatePresence>
                  {selectedQuestion !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="grid size-6 place-items-center rounded-md bg-teal-600 text-[10px] font-bold text-white">
                          П
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Виртуальный пациент:
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed pl-8">
                        {selectedQuestion === 1
                          ? t('step1PatientResponse')
                          : 'Аллергий ранее не замечал, лекарства регулярно не принимаю.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Physical Exam */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    2. {t('step2Title')}
                  </h2>
                  <p className="text-xs font-semibold text-cyan-700">
                    Физикальный осмотр & Жизненные показатели
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                {t('step2Desc')}
              </p>

              {/* Vitals Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">ЧСС</div>
                  <div className="mt-1 text-lg font-black text-slate-900">88 bpm</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">АД</div>
                  <div className="mt-1 text-lg font-black text-slate-900">145/90</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">SpO₂</div>
                  <div className="mt-1 text-lg font-black text-slate-900">96%</div>
                </div>
              </div>

              {/* Interactive Exam Action */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                <p className="text-xs font-bold text-slate-700">
                  {t('step2ExamLabel')}
                </p>
                <button
                  onClick={() => setExamDone(true)}
                  className={`focus-ring flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                    examDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20'
                  }`}
                >
                  <Stethoscope size={16} />
                  {examDone ? 'Осмотр выполнен ✓' : t('step2ActionBtn')}
                </button>

                {examDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-semibold text-emerald-900"
                  >
                    {t('step2Result')}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Order Investigations */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                  <TestTube size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    3. {t('step3Title')}
                  </h2>
                  <p className="text-xs font-semibold text-amber-700">
                    Лабораторная & Инструментальная диагностика
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                {t('step3Desc')}
              </p>

              {/* Test Selection Practice */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setSelectedTest('useful')}
                  className={`focus-ring flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    selectedTest === 'useful'
                      ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2
                    size={20}
                    className={
                      selectedTest === 'useful'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {t('step3Useful')}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                      Показано при остром коронарном синдроме
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedTest('extra')}
                  className={`focus-ring flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    selectedTest === 'extra'
                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <AlertCircle
                    size={20}
                    className={
                      selectedTest === 'extra'
                        ? 'text-amber-600'
                        : 'text-slate-400'
                    }
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {t('step3Extra')}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                      Учебная стоимость: +$450 (Необоснованно)
                    </p>
                  </div>
                </button>
              </div>

              {selectedTest && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-700 leading-relaxed"
                >
                  💡 {t('step3Explanation')}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Diagnosis & Debrief */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    4. {t('step4Title')}
                  </h2>
                  <p className="text-xs font-semibold text-emerald-700">
                    Оценка компетенций & Разбор приёма
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                {t('step4Desc')}
              </p>

              {/* Sample Debrief Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
                <p className="text-xs font-bold text-slate-800">
                  {t('step4ScoringLabel')}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs font-semibold border border-slate-200">
                    <span className="text-slate-700">{t('step4ScoreItem1')}</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800 font-bold">
                      95%
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs font-semibold border border-slate-200">
                    <span className="text-slate-700">{t('step4ScoreItem2')}</span>
                    <span className="rounded-md bg-teal-100 px-2 py-0.5 text-teal-800 font-bold">
                      ✓ Выявлен
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs font-semibold border border-slate-200">
                    <span className="text-slate-700">{t('step4ScoreItem3')}</span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 font-bold">
                      -5 баллов
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Greeting & Call To Action */}
              <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 text-center space-y-4">
                <h3 className="text-lg font-bold text-teal-950">
                  {t('finishGreeting', { name: userName })}
                </h3>

                <button
                  onClick={finishOnboarding}
                  className="focus-ring inline-flex items-center gap-2.5 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition-all hover:scale-105"
                >
                  {t('selectPatient')}
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Controls (Prev / Next / Keyboard Hints) */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="focus-ring flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
          {t('back')}
        </button>

        <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
          Используйте стрелки ← / → на клавиатуре
        </span>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
          >
            {t('next')}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={finishOnboarding}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            {t('selectPatient')}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
