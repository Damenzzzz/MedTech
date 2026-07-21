'use client';

import { useState } from 'react';
import type { StudentCaseDTO } from '@/domain/schemas';
import { PatientCard } from './patient-card';
import { ChevronDown } from 'lucide-react';

interface PatientGridProps {
  cases: StudentCaseDTO[];
  locale: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function PatientGrid({
  cases,
  locale,
  favorites,
  onToggleFavorite,
}: PatientGridProps) {
  const INITIAL_PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PAGE_SIZE);

  const visibleCases = cases.slice(0, visibleCount);
  const hasMore = visibleCount < cases.length;

  return (
    <div className="space-y-8">
      {/* Grid Layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCases.map((item, idx) => (
          <PatientCard
            key={item.id}
            item={item}
            locale={locale}
            isFavorite={favorites.includes(item.id)}
            onToggleFavorite={onToggleFavorite}
            index={idx}
          />
        ))}
      </div>

      {/* Show More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="focus-ring flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all hover:scale-105"
          >
            <span>Показать ещё ({cases.length - visibleCount})</span>
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
