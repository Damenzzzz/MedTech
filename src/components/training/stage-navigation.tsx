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
      <aside className="hidden xl:block w-64 border-r border-slate-200/80 bg-white p-4 shrink-0 space-y-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
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
                      ? 'bg-teal-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50/60 text-emerald-950 font-bold hover:bg-emerald-100/60'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
      <div className="xl:hidden border-b border-slate-200 bg-white px-3 py-2 overflow-x-auto">
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
                    ? 'bg-teal-600 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-md text-[10px] font-extrabold ${
                    isCurrent
                      ? 'bg-white text-teal-800'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
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
