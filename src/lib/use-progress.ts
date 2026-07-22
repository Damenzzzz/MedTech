'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  getProgressServerSnapshot,
  getProgressSnapshot,
  subscribeProgress,
  type ProgressEntry,
} from '@/lib/progress';

/**
 * Reads `kms-progress` as an external store: the server snapshot is empty, so
 * SSR markup matches hydration, and writes from `saveProgressEntry` (or another
 * tab) re-render subscribers automatically.
 */
export function useProgress(): ProgressEntry[] {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, getProgressServerSnapshot);
}

export function useCompletedCaseIds(): Set<string> {
  const entries = useProgress();
  return useMemo(() => new Set(entries.map((e) => e.caseId)), [entries]);
}
