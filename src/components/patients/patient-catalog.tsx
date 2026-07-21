'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudentCaseDTO } from '@/domain/schemas';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active training session store
  const trainingSession = useTrainingStore((s) => s.session);

  // Favorites state (persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Initialize favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kms-favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {
      // Fallback if localStorage unavailable
    }
  }, []);

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

  // Sync state changes to URL Search Params
  const updateUrlParams = useCallback(
    (updates: {
      search?: string;
      specialty?: string;
      urgency?: string;
      difficulty?: string;
      ageGroup?: string;
      onlyFavorites?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const nextSearch = updates.search !== undefined ? updates.search : search;
      const nextSpecialty = updates.specialty !== undefined ? updates.specialty : specialty;
      const nextUrgency = updates.urgency !== undefined ? updates.urgency : urgency;
      const nextDifficulty = updates.difficulty !== undefined ? updates.difficulty : difficulty;
      const nextAgeGroup = updates.ageGroup !== undefined ? updates.ageGroup : ageGroup;
      const nextFav = updates.onlyFavorites !== undefined ? updates.onlyFavorites : onlyFavorites;

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

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, search, specialty, urgency, difficulty, ageGroup, onlyFavorites, pathname, router]
  );

  const handleFilterChange = (updates: Partial<{
    search: string;
    specialty: string;
    urgency: string;
    difficulty: string;
    ageGroup: string;
    onlyFavorites: boolean;
  }>) => {
    if (updates.search !== undefined) setSearch(updates.search);
    if (updates.specialty !== undefined) setSpecialty(updates.specialty);
    if (updates.urgency !== undefined) setUrgency(updates.urgency);
    if (updates.difficulty !== undefined) setDifficulty(updates.difficulty);
    if (updates.ageGroup !== undefined) setAgeGroup(updates.ageGroup);
    if (updates.onlyFavorites !== undefined) setOnlyFavorites(updates.onlyFavorites);

    updateUrlParams(updates);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSpecialty('all');
    setUrgency('all');
    setDifficulty('all');
    setAgeGroup('all');
    setOnlyFavorites(false);

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

      return (
        matchesSearch &&
        matchesSpecialty &&
        matchesUrgency &&
        matchesDifficulty &&
        matchesFavorites
      );
    });
  }, [cases, locale, search, specialty, urgency, difficulty, onlyFavorites, favorites]);

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
        completedCount={0}
        onSelectRandom={handleSelectRandom}
        onResumeLast={handleResumeLast}
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
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        specialties={specialties}
        totalResults={filteredCases.length}
      />

      {/* Grid or Empty State */}
      {filteredCases.length > 0 ? (
        <PatientGrid
          cases={filteredCases}
          locale={locale}
          favorites={favorites}
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
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        specialties={specialties}
        totalResults={filteredCases.length}
      />
    </div>
  );
}
