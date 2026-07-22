import { z } from 'zod';

/* ── Versioned progress storage (client-safe, shared by dashboard & catalog) ── */

export const STORAGE_KEY = 'kms-progress';
const MAX_ENTRIES = 50;

export const ProgressEntrySchema = z.object({
  caseId: z.string(),
  sessionId: z.string(),
  score: z.number().min(0).max(100),
  specialty: z.string(),
  validationTier: z.enum(['core', 'beta']).optional().default('beta'),
  missedRedFlags: z.array(z.string()).optional().default([]),
  criticalErrors: z.array(z.string()).optional().default([]),
  categories: z.record(z.string(), z.number()).optional(),
  completedAt: z.number(),
});
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;

const ProgressStoreSchema = z.object({
  version: z.literal(1),
  entries: z.array(ProgressEntrySchema),
});

/** Reads `kms-progress`, tolerating both the v1 envelope and the legacy bare array. */
export function loadProgress(): ProgressEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // v1 envelope
    if (parsed && typeof parsed === 'object' && parsed.version === 1) {
      return ProgressStoreSchema.parse(parsed).entries;
    }

    // Legacy array format
    if (Array.isArray(parsed)) {
      const entries: ProgressEntry[] = [];
      for (const item of parsed) {
        const result = ProgressEntrySchema.safeParse(item);
        if (result.success) entries.push(result.data);
      }
      return entries;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Idempotently upserts one attempt keyed by `sessionId` (re-running the same
 * session overwrites its entry instead of duplicating it) and keeps the newest
 * MAX_ENTRIES. Never throws — a full/blocked localStorage must not break the
 * debrief navigation.
 */
export function saveProgressEntry(entry: unknown): ProgressEntry[] {
  const parsed = ProgressEntrySchema.safeParse(entry);
  if (!parsed.success) return loadProgress();

  const next = [...loadProgress().filter((e) => e.sessionId !== parsed.data.sessionId), parsed.data]
    .sort((a, b) => a.completedAt - b.completedAt)
    .slice(-MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
  } catch {
    // Storage unavailable — keep the in-memory result so callers still see the entry.
  }

  cache = next;
  for (const listener of listeners) listener();
  return next;
}

export function getCompletedCaseIds(): Set<string> {
  return new Set(loadProgress().map((e) => e.caseId));
}

/** Wipes every recorded attempt. Callers are expected to confirm with the user first. */
export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — still reset the in-memory snapshot below.
  }
  cache = [];
  for (const listener of listeners) listener();
}

/* ── External-store adapter, so components can read progress via useSyncExternalStore ── */

const EMPTY: ProgressEntry[] = [];
let cache: ProgressEntry[] | null = null;
const listeners = new Set<() => void>();

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cache = null;
  for (const listener of listeners) listener();
}

export function subscribeProgress(listener: () => void): () => void {
  if (listeners.size === 0) {
    // Another tab may have written while nothing was subscribed.
    cache = null;
    if (typeof window !== 'undefined') window.addEventListener('storage', handleStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/** Referentially stable between writes, as useSyncExternalStore requires. */
export function getProgressSnapshot(): ProgressEntry[] {
  if (cache === null) cache = loadProgress();
  return cache;
}

export function getProgressServerSnapshot(): ProgressEntry[] {
  return EMPTY;
}
