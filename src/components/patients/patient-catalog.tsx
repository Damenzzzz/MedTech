'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { StudentCaseDTO } from '@/domain/schemas';
import { clearProgress, type ProgressEntry } from '@/lib/progress';
import { useProgress } from '@/lib/use-progress';
import { useRouter, usePathname } from '@/i18n/navigation';
import { CatalogHeader } from './catalog-header';
import { CatalogToolbar } from './catalog-toolbar';
import { PatientGrid } from './patient-grid';
import { FilterDrawer } from './filter-drawer';
import { EmptyState } from './empty-state';
import { useTrainingStore } from '@/stores/training-store';

interface PatientCatalogProps {
  cases: StudentCaseDTO[];
  locale: string;
}

export function PatientCatalog({ cases, locale }: PatientCatalogProps) {
  const tCatalog = useTranslations('Catalog');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active training session store
  const trainingSession = useTrainingStore((s) => s.session);

  // Favorites state (persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('kms-favorites');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Completed cases live in localStorage; empty on the server, filled after hydration.
  const progressEntries = useProgress();
  const latestProgressByCase = useMemo(() => {
    const map = new Map<string, ProgressEntry>();
    // Entries come oldest-first, so the last write per caseId is the most recent attempt.
    for (const entry of progressEntries) map.set(entry.caseId, entry);
    return map;
  }, [progressEntries]);
  const completedIds = useMemo(() => new Set(latestProgressByCase.keys()), [latestProgressByCase]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];

    setFavorites(next);
    try {
      localStorage.setItem('kms-favorites', JSON.stringify(next));
    } catch {
      // Fallback
    }
  };

  // Filter State initialized from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('q') || '');
  const [specialty, setSpecialty] = useState<string>(searchParams.get('specialty') || 'all');
  const [urgency, setUrgency] = useState<string>(searchParams.get('urgency') || 'all');
  const [difficulty, setDifficulty] = useState<string>(searchParams.get('difficulty') || 'all');
  const [ageGroup, setAgeGroup] = useState<string>(searchParams.get('ageGroup') || 'all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(searchParams.get('favorites') === 'true');
  const [hideCompleted, setHideCompleted] = useState<boolean>(searchParams.get('hideCompleted') === 'true');

  // Sync state changes to URL Search Params
  const updateUrlParams = useCallback(
    (updates: {
      search?: string;
      specialty?: string;
      urgency?: string;
      difficulty?: string;
      ageGroup?: string;
      onlyFavorites?: boolean;
      hideCompleted?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const nextSearch = updates.search !== undefined ? updates.search : search;
      const nextSpecialty = updates.specialty !== undefined ? updates.specialty : specialty;
      const nextUrgency = updates.urgency !== undefined ? updates.urgency : urgency;
      const nextDifficulty = updates.difficulty !== undefined ? updates.difficulty : difficulty;
      const nextAgeGroup = updates.ageGroup !== undefined ? updates.ageGroup : ageGroup;
      const nextFav = updates.onlyFavorites !== undefined ? updates.onlyFavorites : onlyFavorites;
      const nextHideCompleted = updates.hideCompleted !== undefined ? updates.hideCompleted : hideCompleted;

      if (nextSearch) params.set('q', nextSearch);
      else params.delete('q');

      if (nextSpecialty !== 'all') params.set('specialty', nextSpecialty);
      else params.delete('specialty');

      if (nextUrgency !== 'all') params.set('urgency', nextUrgency);
      else params.delete('urgency');

      if (nextDifficulty !== 'all') params.set('difficulty', nextDifficulty);
      else params.delete('difficulty');

      if (nextAgeGroup !== 'all') params.set('ageGroup', nextAgeGroup);
      else params.delete('ageGroup');

      if (nextFav) params.set('favorites', 'true');
      else params.delete('favorites');

      if (nextHideCompleted) params.set('hideCompleted', 'true');
      else params.delete('hideCompleted');

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, search, specialty, urgency, difficulty, ageGroup, onlyFavorites, hideCompleted, pathname, router]
  );

  const handleFilterChange = (updates: Partial<{
    search: string;
    specialty: string;
    urgency: string;
    difficulty: string;
    ageGroup: string;
    onlyFavorites: boolean;
    hideCompleted: boolean;
  }>) => {
    if (updates.search !== undefined) setSearch(updates.search);
    if (updates.specialty !== undefined) setSpecialty(updates.specialty);
    if (updates.urgency !== undefined) setUrgency(updates.urgency);
    if (updates.difficulty !== undefined) setDifficulty(updates.difficulty);
    if (updates.ageGroup !== undefined) setAgeGroup(updates.ageGroup);
    if (updates.onlyFavorites !== undefined) setOnlyFavorites(updates.onlyFavorites);
    if (updates.hideCompleted !== undefined) setHideCompleted(updates.hideCompleted);

    updateUrlParams(updates);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSpecialty('all');
    setUrgency('all');
    setDifficulty('all');
    setAgeGroup('all');
    setOnlyFavorites(false);
    setHideCompleted(false);

    router.replace(pathname, { scroll: false });
  };

  // Distinct Specialties List
  const specialties = useMemo(
    () => Array.from(new Set(cases.map((c) => c.specialty))),
    [cases]
  );

  // Filter Logic
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const nameStr =
        typeof item.patient.name === 'object'
          ? (item.patient.name[locale as 'ru' | 'kk' | 'en'] || item.patient.name.ru)
          : item.patient.name;

      const complaintStr =
        typeof item.complaint === 'object'
          ? (item.complaint[locale as 'ru' | 'kk' | 'en'] || item.complaint.ru)
          : item.complaint;

      const haystack = `${nameStr} ${complaintStr} ${item.specialty}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase().trim());
      const matchesSpecialty = specialty === 'all' || item.specialty === specialty;
      const matchesUrgency = urgency === 'all' || item.urgency === urgency;
      const matchesDifficulty = difficulty === 'all' || item.difficulty === difficulty;
      const matchesFavorites = !onlyFavorites || favorites.includes(item.id);
      const matchesCompleted = !hideCompleted || !completedIds.has(item.id);

      return (
        matchesSearch &&
        matchesSpecialty &&
        matchesUrgency &&
        matchesDifficulty &&
        matchesFavorites &&
        matchesCompleted
      );
    });
  }, [cases, locale, search, specialty, urgency, difficulty, onlyFavorites, favorites, hideCompleted, completedIds]);

  // Completed cases stay in the list (so they can be retaken) but sink to the bottom.
  const orderedCases = useMemo(() => {
    if (completedIds.size === 0) return filteredCases;
    return [...filteredCases].sort(
      (a, b) => Number(completedIds.has(a.id)) - Number(completedIds.has(b.id))
    );
  }, [filteredCases, completedIds]);

  // Count only cases still present in the catalog, so "X из N" can never overflow.
  const completedCount = useMemo(
    () => cases.reduce((n, item) => n + (completedIds.has(item.id) ? 1 : 0), 0),
    [cases, completedIds]
  );

  const handleResetProgress = () => {
    if (!window.confirm(tCatalog('resetProgressConfirm'))) return;
    clearProgress();
  };

  // Random Case Selector
  const handleSelectRandom = () => {
    const pool = filteredCases.length > 0 ? filteredCases : cases;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];
    if (selected) {
      router.push(`/training/${selected.id}`);
    }
  };

  // Resume last session
  const handleResumeLast = () => {
    if (trainingSession?.caseId) {
      router.push(`/training/${trainingSession.caseId}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <CatalogHeader
        totalCases={cases.length}
        completedCount={completedCount}
        onSelectRandom={handleSelectRandom}
        onResumeLast={handleResumeLast}
        onResetProgress={handleResetProgress}
        hasActiveSession={Boolean(trainingSession?.caseId)}
      />

      {/* Filter Toolbar */}
      <CatalogToolbar
        filters={{
          search,
          specialty,
          urgency,
          difficulty,
          ageGroup,
          onlyFavorites,
          hideCompleted,
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        specialties={specialties}
        totalResults={orderedCases.length}
      />

      {/* Grid or Empty State */}
      {orderedCases.length > 0 ? (
        <PatientGrid
          cases={orderedCases}
          locale={locale}
          favorites={favorites}
          progressByCase={latestProgressByCase}
          onToggleFavorite={toggleFavorite}
        />
      ) : (
        <EmptyState onResetFilters={handleResetFilters} />
      )}

      {/* Mobile Drawer */}
      <FilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        filters={{
          search,
          specialty,
          urgency,
          difficulty,
          ageGroup,
          onlyFavorites,
          hideCompleted,
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        specialties={specialties}
        totalResults={orderedCases.length}
      />
    </div>
  );
}
