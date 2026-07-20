'use client';

import { useTranslations } from 'next-intl';
import { Shuffle, RotateCcw, Activity, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useUserStore } from '@/stores/user-store';

interface CatalogHeaderProps {
  totalCases: number;
  completedCount: number;
  onSelectRandom: () => void;
  onResumeLast: () => void;
  hasActiveSession: boolean;
}

export function CatalogHeader({
  totalCases,
  completedCount,
  onSelectRandom,
  onResumeLast,
  hasActiveSession,
}: CatalogHeaderProps) {
  const t = useTranslations('Catalog');
  const navT = useTranslations('Nav');
  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);

  const userName = hydrated && profile?.name ? profile.name : 'Коллега';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200/80 pb-6"
    >
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          <Sparkles size={14} className="text-teal-600" />
          <span>{navT('greeting', { name: userName })}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {t('title')}
        </h1>

        <p className="text-sm font-medium text-slate-600 leading-relaxed">
          {t('lead')}
        </p>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs">
            <Activity size={15} className="text-teal-600" />
            <span>Доступно: {totalCases} случаев</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
            <Trophy size={15} className="text-emerald-600" />
            <span>Пройдено: {completedCount} из {totalCases}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2.5">
        {hasActiveSession && (
          <button
            onClick={onResumeLast}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 transition-all"
          >
            <RotateCcw size={16} className="text-amber-700" />
            <span>Продолжить приём</span>
          </button>
        )}

        <button
          onClick={onSelectRandom}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Shuffle size={16} />
          <span>{t('random')}</span>
        </button>
      </div>
    </motion.div>
  );
}
