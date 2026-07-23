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
    <header className="sticky top-0 z-30 border-b border-[var(--glass-border)] bg-[var(--surface-glass-strong)] backdrop-blur-xl px-4 py-3 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Back & Patient Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenLeave}
            className="focus-ring flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t('queue')}</span>
          </button>

          <div className="h-5 w-px bg-[var(--border-color)] shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {typeof patient.patient.name === 'object'
                  ? patient.patient.name.ru
                  : patient.patient.name}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#EAF2FE] px-2 py-0.5 text-[10px] font-bold text-[#124F8C] border border-[#AFCBFB]">
                <ShieldCheck size={12} />
                {c('synthetic')}
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${patient.validationTier === 'core' ? 'bg-[#EAF9F7] text-[#084D47] border-[#6CD6C9]' : 'bg-[#FDF3E7] text-[#6B4414] border-[#EAB165]'}`}>
                {patient.validationTier === 'core' ? 'Core (Verified)' : 'Beta (Unreviewed)'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)] truncate">
              {patient.patient.age} ({patient.specialty})
            </p>
          </div>
        </div>

        {/* Center: Stage Progress Ring / Bar */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
              <span>{t('stage')} {currentStage + 1} / {totalStages}</span>
              <span className="text-[#1F6FEB] font-extrabold">({progressPercent}%)</span>
            </div>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--border-color)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2E86E0] to-[#1FB6D0] transition-all duration-300"
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
            className="focus-ring hidden sm:flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)]"
            title={t('quick')}
          >
            <Command size={14} />
            <span className="text-[10px] font-bold">Cmd+K</span>
          </button>

          {/* Autosave pulse indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#0E7D72] bg-[#EAF9F7] border border-[#A6E3DA]/80 px-2.5 py-1 rounded-xl">
            <span className="size-2 rounded-full bg-[#12B5A6] animate-pulse" />
            <span>Auto</span>
          </div>

          {/* Timer */}
          <div className="mono flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-xs">
            <Clock size={15} className="text-[#1F6FEB]" />
            <span>{minutes}:{seconds}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
