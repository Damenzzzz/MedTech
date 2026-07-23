'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

interface StageNavigationProps {
  currentStage: number;
  onSelectStage: (stageIndex: number) => void;
}

/** Horizontal scrollable pill timeline, matching the Spatial clinical-timeline pattern at every breakpoint. */
export function StageNavigation({ currentStage, onSelectStage }: StageNavigationProps) {
  const t = useTranslations('Training');
  const stageLabels = (t.raw('stages') as string[]) || [];

  return (
    <div className="flex gap-1.5 overflow-x-auto px-0.5 py-1">
      {stageLabels.map((label, i) => {
        const isCompleted = i < currentStage;
        const isCurrent = i === currentStage;

        return (
          <button
            key={label}
            onClick={() => onSelectStage(i)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              isCurrent
                ? 'bg-[linear-gradient(135deg,#1F6FEB,#12B5A6)] text-white shadow-xs'
                : isCompleted
                  ? 'bg-[#EAF2FE] text-[#124F8C]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
            }`}
          >
            <span
              className={`grid size-[18px] shrink-0 place-items-center rounded-full text-[9.5px] font-bold ${
                isCurrent ? 'bg-white/25 text-white' : isCompleted ? 'bg-[#12B5A6] text-white' : 'bg-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              {isCompleted ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
