import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, getCompletedCaseIds, loadProgress, saveProgressEntry } from '@/lib/progress';

const entry = (overrides: Record<string, unknown> = {}) => ({
  caseId: 'case-1',
  sessionId: 'session-1',
  score: 82,
  specialty: 'Кардиология',
  completedAt: 1_700_000_000_000,
  ...overrides,
});

describe('progress storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadProgress()).toEqual([]);
  });

  it('reads the legacy bare-array format', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry(), { garbage: true }]));
    const entries = loadProgress();

    expect(entries).toHaveLength(1);
    expect(entries[0].caseId).toBe('case-1');
  });

  it('persists a completed case so the catalog can mark it', () => {
    saveProgressEntry(entry());

    expect(loadProgress()).toHaveLength(1);
    expect(getCompletedCaseIds().has('case-1')).toBe(true);
  });

  it('upserts by sessionId instead of duplicating the same attempt', () => {
    saveProgressEntry(entry());
    saveProgressEntry(entry({ score: 91 }));

    const entries = loadProgress();
    expect(entries).toHaveLength(1);
    expect(entries[0].score).toBe(91);
  });

  it('keeps separate attempts of the same case', () => {
    saveProgressEntry(entry());
    saveProgressEntry(entry({ sessionId: 'session-2', completedAt: 1_700_000_100_000 }));

    expect(loadProgress()).toHaveLength(2);
    expect(getCompletedCaseIds().size).toBe(1);
  });

  it('ignores entries that fail schema validation', () => {
    saveProgressEntry({ caseId: 'case-2' });

    expect(loadProgress()).toEqual([]);
  });

  it('caps history at 50 newest entries', () => {
    for (let i = 0; i < 55; i++) {
      saveProgressEntry(entry({ sessionId: `session-${i}`, caseId: `case-${i}`, completedAt: 1_700_000_000_000 + i }));
    }

    const entries = loadProgress();
    expect(entries).toHaveLength(50);
    expect(entries[0].sessionId).toBe('session-5');
  });
});
