'use client';

import { useTranslations } from 'next-intl';
import { Shuffle, RotateCcw, Activity, Sparkles, Trophy, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useUserStore } from '@/stores/user-store';

interface CatalogHeaderProps {
  totalCases: number;
  completedCount: number;
  onSelectRandom: () => void;
  onResumeLast: () => void;
  onResetProgress?: () => void;
  hasActiveSession: boolean;
}

export function CatalogHeader({
  totalCases,
  completedCount,
  onSelectRandom,
  onResumeLast,
  onResetProgress,
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
      className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-[var(--border-color)] pb-6"
    >
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#AFCBFB] bg-[#EAF2FE] px-3 py-1 text-xs font-semibold text-[#124F8C]">
          <Sparkles size={14} className="text-[#1F6FEB]" />
          <span>{navT('greeting', { name: userName })}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t('title')}
        </h1>

        <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
          {t('lead')}
        </p>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="glass inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]">
            <Activity size={15} className="text-[#1F6FEB]" />
            <span>Доступно: {totalCases} случаев</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#A6E3DA] bg-[#EAF9F7] px-3 py-1.5 text-xs font-bold text-[#0B645C] shadow-xs">
            <Trophy size={15} className="text-[#0E9E92]" />
            <span>Пройдено: {completedCount} из {totalCases}</span>
          </div>

          {completedCount > 0 && onResetProgress && (
            <button
              type="button"
              onClick={onResetProgress}
              className="glass focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={14} />
              <span>{t('resetProgress')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2.5">
        {hasActiveSession && (
          <button
            onClick={onResumeLast}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-[#EAB165] bg-[#FDF3E7] px-4 text-xs font-bold text-[#6B4414] shadow-xs hover:bg-[#FAE3C4] transition-all"
          >
            <RotateCcw size={16} className="text-[#A3661D]" />
            <span>Продолжить приём</span>
          </button>
        )}

        <button
          onClick={onSelectRandom}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[#1F6FEB] px-5 text-xs font-bold text-white shadow-md shadow-[#1F6FEB]/20 hover:bg-[#1A5FD0] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Shuffle size={16} />
          <span>{t('random')}</span>
        </button>
      </div>
    </motion.div>
  );
}
