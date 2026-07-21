'use client';

import { useTranslations } from 'next-intl';
import { Search, Heart, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

interface FilterState {
  search: string;
  specialty: string;
  urgency: string;
  difficulty: string;
  ageGroup: string;
  onlyFavorites: boolean;
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
    filters.onlyFavorites;

  return (
    <div className="space-y-3">
      {/* Desktop Toolbar */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs md:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            aria-label={t('search')}
            placeholder={t('search')}
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="input pl-9 text-xs border-slate-200 focus:border-teal-600 h-10"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
          className="input text-xs border-slate-200 h-10 bg-white font-medium"
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
          className="input text-xs border-slate-200 h-10 bg-white font-medium"
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
          className="input text-xs border-slate-200 h-10 bg-white font-medium"
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
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Heart size={15} fill={filters.onlyFavorites ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">{t('favorites')}</span>
        </button>

        {/* Mobile Filter Drawer Trigger */}
        <button
          onClick={onOpenMobileDrawer}
          className="focus-ring flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 md:hidden hover:bg-slate-100"
          aria-label="Открыть фильтры"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Active Filter Chips & Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-500">
            Найдено: <strong className="text-slate-900 font-bold">{totalResults}</strong>
          </span>

          {filters.specialty !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 font-semibold text-teal-800 border border-teal-200">
              {filters.specialty}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ specialty: 'all' })} />
            </span>
          )}

          {filters.urgency !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 border border-amber-200">
              {t(filters.urgency)}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ urgency: 'all' })} />
            </span>
          )}

          {filters.difficulty !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-800 border border-cyan-200">
              {t(filters.difficulty)}
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ difficulty: 'all' })} />
            </span>
          )}

          {filters.onlyFavorites && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-800 border border-red-200">
              ❤️ Избранное
              <X size={13} className="cursor-pointer" onClick={() => onFilterChange({ onlyFavorites: false })} />
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RotateCcw size={13} />
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}
