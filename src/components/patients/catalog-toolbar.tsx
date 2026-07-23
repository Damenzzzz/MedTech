'use client';

import { useTranslations } from 'next-intl';
import { Search, Heart, SlidersHorizontal, X, RotateCcw, CheckCircle2 } from 'lucide-react';

interface FilterState {
  search: string;
  specialty: string;
  urgency: string;
  difficulty: string;
  ageGroup: string;
  onlyFavorites: boolean;
  hideCompleted: boolean;
}

interface CatalogToolbarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onOpenMobileDrawer: () => void;
  specialties: string[];
  totalResults: number;
}

export function CatalogToolbar({
  filters,
  onFilterChange,
  onResetFilters,
  onOpenMobileDrawer,
  specialties,
  totalResults,
}: CatalogToolbarProps) {
  const t = useTranslations('Catalog');
  const c = useTranslations('Common');

  const hasActiveFilters =
    filters.search !== '' ||
    filters.specialty !== 'all' ||
    filters.urgency !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.ageGroup !== 'all' ||
    filters.onlyFavorites ||
    filters.hideCompleted;

  return (
    <div className="space-y-3">
      {/* Desktop Toolbar */}
      <div className="glass grid gap-3 rounded-2xl p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto_auto]">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={15} />
          <input
            type="text"
            aria-label={t('search')}
            placeholder={t('search')}
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            style={{ paddingLeft: '2.25rem' }}
            className="input pl-9 text-xs h-10"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Specialty Filter */}
        <select
          aria-label={t('specialty')}
          value={filters.specialty}
          onChange={(e) => onFilterChange({ specialty: e.target.value })}
          className="input text-xs h-10 font-medium"
        >
          <option value="all">{t('specialty')}: {c('all')}</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Urgency Filter */}
        <select
          aria-label={t('urgency')}
          value={filters.urgency}
          onChange={(e) => onFilterChange({ urgency: e.target.value })}
          className="input text-xs h-10 font-medium"
        >
          <option value="all">{t('urgency')}: {c('all')}</option>
          <option value="routine">{t('routine')}</option>
          <option value="urgent">{t('urgent')}</option>
          <option value="emergency">{t('emergency')}</option>
        </select>

        {/* Difficulty Filter */}
        <select
          aria-label={t('difficulty')}
          value={filters.difficulty}
          onChange={(e) => onFilterChange({ difficulty: e.target.value })}
          className="input text-xs h-10 font-medium"
        >
          <option value="all">{t('difficulty')}: {c('all')}</option>
          <option value="easy">{t('easy')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="hard">{t('hard')}</option>
        </select>

        {/* Favorites Toggle */}
        <button
          onClick={() => onFilterChange({ onlyFavorites: !filters.onlyFavorites })}
          className={`focus-ring flex items-center gap-1.5 rounded-xl border px-3.5 h-10 text-xs font-bold transition-all ${
            filters.onlyFavorites
              ? 'border-red-300 bg-red-50 text-red-700 shadow-xs'
              : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)] hover:bg-[var(--surface)]'
          }`}
        >
          <Heart size={15} fill={filters.onlyFavorites ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">{t('favorites')}</span>
        </button>

        {/* Hide Completed Toggle */}
        <button
          onClick={() => onFilterChange({ hideCompleted: !filters.hideCompleted })}
          aria-pressed={filters.hideCompleted}
          className={`focus-ring flex items-center gap-1.5 rounded-xl border px-3.5 h-10 text-xs font-bold transition-all ${
            filters.hideCompleted
              ? 'border-[#6CD6C9] bg-[#EAF9F7] text-[#0B645C] shadow-xs'
              : 'border-[var(--border-color)] bg-[var(--surface)]/70 text-[var(--text-secondary)] hover:bg-[var(--surface)]'
          }`}
        >
          <CheckCircle2 size={15} />
          <span className="hidden sm:inline">{t('hideCompleted')}</span>
        </button>

        {/* Mobile Filter Drawer Trigger */}
        <button
          onClick={onOpenMobileDrawer}
          className="focus-ring flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 p-2.5 text-[var(--text-secondary)] md:hidden hover:bg-[var(--surface)]"
          aria-label="Открыть фильтры"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Active Filter Chips & Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-tertiary)]">
            Найдено: <strong className="text-[var(--text-primary)] font-bold">{totalResults}</strong>
          </span>

          {filters.specialty !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF2FE] px-2.5 py-1 font-semibold text-[#124F8C] border border-[#AFCBFB]">
              {filters.specialty}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ specialty: 'all' })} />
            </span>
          )}

          {filters.urgency !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FDF3E7] px-2.5 py-1 font-semibold text-[#855518] border border-[#F3CA8D]">
              {t(filters.urgency)}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ urgency: 'all' })} />
            </span>
          )}

          {filters.difficulty !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#E8F7FA] px-2.5 py-1 font-semibold text-[#126374] border border-[#9DE0EC]">
              {t(filters.difficulty)}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ difficulty: 'all' })} />
            </span>
          )}

          {filters.onlyFavorites && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-800 border border-red-200">
              ❤️ {t('favorites')}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ onlyFavorites: false })} />
            </span>
          )}

          {filters.hideCompleted && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF9F7] px-2.5 py-1 font-semibold text-[#0B645C] border border-[#A6E3DA]">
              <CheckCircle2 size={13} />
              {t('hideCompleted')}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ hideCompleted: false })} />
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw size={13} />
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}
