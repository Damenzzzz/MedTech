'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Clock, ShieldCheck, Command } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface TrainingHeaderProps {
  patient: StudentCaseDTO;
  elapsedSeconds: number;
  currentStage: number;
  totalStages: number;
  onOpenLeave: () => void;
  onOpenCommandPalette: () => void;
}

export function TrainingHeader({
  patient,
  elapsedSeconds,
  currentStage,
  totalStages,
  onOpenLeave,
  onOpenCommandPalette,
}: TrainingHeaderProps) {
  const t = useTranslations('Training');
  const c = useTranslations('Common');

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  const progressPercent = Math.round(((currentStage + 1) / totalStages) * 100);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Back & Patient Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenLeave}
            className="focus-ring flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t('queue')}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {typeof patient.patient.name === 'object'
                  ? patient.patient.name.ru
                  : patient.patient.name}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                <ShieldCheck size={12} />
                {c('synthetic')}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              {patient.patient.age} лет · {patient.specialty}
            </p>
          </div>
        </div>

        {/* Center: Stage Progress Ring / Bar */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>Этап {currentStage + 1} из {totalStages}</span>
              <span className="text-teal-600 font-extrabold">({progressPercent}%)</span>
            </div>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Autosave, Timer, Command Palette */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Command Palette shortcut button */}
          <button
            onClick={onOpenCommandPalette}
            className="focus-ring hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            title="Быстрый переход между этапами (Ctrl+K)"
          >
            <Command size={14} />
            <span className="text-[10px] font-bold">Cmd+K</span>
          </button>

          {/* Autosave pulse indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Автосохранение</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-800 shadow-xs">
            <Clock size={15} className="text-teal-600" />
            <span>{minutes}:{seconds}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
