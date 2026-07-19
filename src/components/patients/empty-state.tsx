'use client';

import { useTranslations } from 'next-intl';
import { Stethoscope, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  onResetFilters: () => void;
}

export function EmptyState({ onResetFilters }: EmptyStateProps) {
  const t = useTranslations('Catalog');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs"
    >
      <div className="grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-600 mb-4">
        <Stethoscope size={32} />
      </div>

      <h3 className="text-xl font-bold text-slate-900">
        {t('empty')}
      </h3>

      <p className="mt-2 text-xs font-medium text-slate-500 max-w-md">
        Попробуйте изменить поисковый запрос или сбросить активные фильтры по специальностям и срочности.
      </p>

      <button
        onClick={onResetFilters}
        className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-all"
      >
        <RotateCcw size={15} />
        <span>{t('reset')}</span>
      </button>
    </motion.div>
  );
}
