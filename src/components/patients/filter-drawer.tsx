'use client';

import { useTranslations } from 'next-intl';
import { X, RotateCcw, Heart, Check, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilterState {
  search: string;
  specialty: string;
  urgency: string;
  difficulty: string;
  ageGroup: string;
  onlyFavorites: boolean;
  hideCompleted: boolean;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  specialties: string[];
  totalResults: number;
}

export function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  specialties,
  totalResults,
}: FilterDrawerProps) {
  const t = useTranslations('Catalog');
  const c = useTranslations('Common');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[rgba(16,32,43,0.4)] backdrop-blur-xs md:hidden"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[var(--glass-border)] bg-[var(--surface-glass-strong)] backdrop-blur-xl p-6 shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 mb-5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Фильтры каталога
              </h3>
              <button
                onClick={onClose}
                className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Specialty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t('specialty')}
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => onFilterChange({ specialty: e.target.value })}
                  className="input text-xs"
                >
                  <option value="all">{t('specialty')}: {c('all')}</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t('urgency')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['all', 'routine', 'urgent', 'emergency'].map((u) => (
                    <button
                      key={u}
                      onClick={() => onFilterChange({ urgency: u })}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        filters.urgency === u
                          ? 'border-[#1F6FEB] bg-[#EAF2FE] text-[#124F8C]'
                          : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)]'
                      }`}
                    >
                      {u === 'all' ? c('all') : t(u)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t('difficulty')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['all', 'easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => onFilterChange({ difficulty: d })}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        filters.difficulty === d
                          ? 'border-[#1A9DB4] bg-[#E8F7FA] text-[#126374]'
                          : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)]'
                      }`}
                    >
                      {d === 'all' ? c('all') : t(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => onFilterChange({ onlyFavorites: !filters.onlyFavorites })}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all ${
                  filters.onlyFavorites
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Heart size={16} fill={filters.onlyFavorites ? 'currentColor' : 'none'} />
                  {t('favorites')}
                </span>
                {filters.onlyFavorites && <Check size={16} />}
              </button>

              {/* Hide Completed Toggle */}
              <button
                onClick={() => onFilterChange({ hideCompleted: !filters.hideCompleted })}
                aria-pressed={filters.hideCompleted}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all ${
                  filters.hideCompleted
                    ? 'border-[#6CD6C9] bg-[#EAF9F7] text-[#0B645C]'
                    : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {t('hideCompleted')}
                </span>
                {filters.hideCompleted && <Check size={16} />}
              </button>

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={onResetFilters}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] py-3 text-xs font-bold text-[var(--text-secondary)]"
                >
                  <RotateCcw size={14} />
                  {t('reset')}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-[#1F6FEB] py-3 text-xs font-bold text-white shadow-md"
                >
                  Показать ({totalResults})
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
