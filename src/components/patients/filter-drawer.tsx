'use client';

import { useTranslations } from 'next-intl';
import { X, RotateCcw, Heart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilterState {
  search: string;
  specialty: string;
  urgency: string;
  difficulty: string;
  ageGroup: string;
  onlyFavorites: boolean;
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
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs md:hidden"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-6 shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-base font-bold text-slate-900">
                Фильтры каталога
              </h3>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Specialty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {t('specialty')}
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => onFilterChange({ specialty: e.target.value })}
                  className="input text-xs border-slate-200"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {t('urgency')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['all', 'routine', 'urgent', 'emergency'].map((u) => (
                    <button
                      key={u}
                      onClick={() => onFilterChange({ urgency: u })}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        filters.urgency === u
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {u === 'all' ? c('all') : t(u)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {t('difficulty')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['all', 'easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => onFilterChange({ difficulty: d })}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        filters.difficulty === d
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                          : 'border-slate-200 bg-white text-slate-700'
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
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Heart size={16} fill={filters.onlyFavorites ? 'currentColor' : 'none'} />
                  {t('favorites')}
                </span>
                {filters.onlyFavorites && <Check size={16} />}
              </button>

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={onResetFilters}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700"
                >
                  <RotateCcw size={14} />
                  {t('reset')}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-md"
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
