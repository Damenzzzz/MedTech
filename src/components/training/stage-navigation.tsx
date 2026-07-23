'use client';

import { useTranslations } from 'next-intl';
import { Check, ClipboardList, MessageCircle, Stethoscope, FlaskConical, HeartPulse, Activity, FileText, Award } from 'lucide-react';

interface StageNavigationProps {
  currentStage: number;
  onSelectStage: (stageIndex: number) => void;
}

const STAGE_ICONS = [
  ClipboardList,
  MessageCircle,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Activity,
  FileText,
  Award,
];

export function StageNavigation({ currentStage, onSelectStage }: StageNavigationProps) {
  const t = useTranslations('Training');
  const stageLabels = (t.raw('stages') as string[]) || [];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="glass-strong hidden xl:block w-64 !rounded-none border-r p-4 shrink-0 space-y-4">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2">
          {t('stage')}
        </p>

        <ol className="space-y-1">
          {stageLabels.map((label, i) => {
            const Icon = STAGE_ICONS[i] || ClipboardList;
            const isCompleted = i < currentStage;
            const isCurrent = i === currentStage;

            return (
              <li key={label}>
                <button
                  onClick={() => onSelectStage(i)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-[linear-gradient(135deg,#1F6FEB,#12B5A6)] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[#EAF9F7]/60 text-[#052B27] font-bold hover:bg-[#D2F1EC]/60'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Mobile / Tablet Top Horizontal Scrollable Bar */}
      <div className="glass !rounded-none xl:hidden border-b px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {stageLabels.map((label, i) => {
            const isCompleted = i < currentStage;
            const isCurrent = i === currentStage;

            return (
              <button
                key={label}
                onClick={() => onSelectStage(i)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-[linear-gradient(135deg,#1F6FEB,#12B5A6)] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-[#EAF2FE] text-[#124F8C] border border-[#AFCBFB]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-md text-[10px] font-extrabold ${
                    isCurrent
                      ? 'bg-white text-[#124F8C]'
                      : isCompleted
                      ? 'bg-[#12B5A6] text-white'
                      : 'bg-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {isCompleted ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
