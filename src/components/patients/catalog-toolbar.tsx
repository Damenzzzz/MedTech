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

  const selectClass =
    'h-9 shrink-0 rounded-full border border-[rgba(16,32,43,0.1)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text-primary)] outline-none';

  return (
    <div className="space-y-2.5">
      {/* Capsule toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--surface-glass)] p-2 pl-3.5 shadow-[0_8px_22px_-12px_rgba(16,32,43,0.2)] backdrop-blur-xl">
        <div className="flex min-w-[180px] flex-1 items-center gap-2">
          <Search size={15} className="shrink-0 text-[var(--text-tertiary)]" />
          <input
            type="text"
            aria-label={t('search')}
            placeholder={t('search')}
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-[34px] w-full min-w-0 border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              aria-label={c('cancel')}
              className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          aria-label={t('specialty')}
          value={filters.specialty}
          onChange={(e) => onFilterChange({ specialty: e.target.value })}
          className={`${selectClass} hidden sm:block`}
        >
          <option value="all">
            {t('specialty')}: {c('all')}
          </option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label={t('urgency')}
          value={filters.urgency}
          onChange={(e) => onFilterChange({ urgency: e.target.value })}
          className={`${selectClass} hidden lg:block`}
        >
          <option value="all">{t('urgency')}</option>
          <option value="routine">{t('routine')}</option>
          <option value="urgent">{t('urgent')}</option>
          <option value="emergency">{t('emergency')}</option>
        </select>

        <select
          aria-label={t('difficulty')}
          value={filters.difficulty}
          onChange={(e) => onFilterChange({ difficulty: e.target.value })}
          className={`${selectClass} hidden lg:block`}
        >
          <option value="all">{t('difficulty')}</option>
          <option value="easy">{t('easy')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="hard">{t('hard')}</option>
        </select>

        <button
          onClick={() => onFilterChange({ onlyFavorites: !filters.onlyFavorites })}
          aria-pressed={filters.onlyFavorites}
          className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all sm:flex ${
            filters.onlyFavorites ? 'bg-red-50 text-red-700' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
          }`}
        >
          <Heart size={14} fill={filters.onlyFavorites ? 'currentColor' : 'none'} />
          {t('favorites')}
        </button>

        <button
          onClick={() => onFilterChange({ hideCompleted: !filters.hideCompleted })}
          aria-pressed={filters.hideCompleted}
          className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all lg:flex ${
            filters.hideCompleted ? 'bg-[#EAF9F7] text-[#0B645C]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
          }`}
        >
          <CheckCircle2 size={14} />
          {t('hideCompleted')}
        </button>

        <button
          onClick={onOpenMobileDrawer}
          className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(16,32,43,0.1)] bg-[var(--surface)] text-[var(--text-secondary)] sm:hidden"
          aria-label={t('difficulty')}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Results count + active filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--text-secondary)]">
            {t('resultsFound')}: <strong className="font-semibold text-[var(--text-primary)]">{totalResults}</strong>
            <span className="hidden text-[var(--text-tertiary)] sm:inline"> · {t('clickToStart')}</span>
          </span>

          {filters.hideCompleted && (
            <button
              onClick={() => onFilterChange({ hideCompleted: false })}
              className="inline-flex items-center gap-1 rounded-lg border border-[#A6E3DA] bg-[#EAF9F7] px-2.5 py-1 font-semibold text-[#0B645C]"
            >
              <CheckCircle2 size={13} />
              {t('hideCompleted')}
              <X size={13} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 font-semibold text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RotateCcw size={13} />
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}
