import { describe, expect, it } from 'vitest';
import { formatElapsedSeconds, ragBadge } from '@/lib/rag-badge';

describe('ragBadge', () => {
  it('returns 1 only when RAG completed and returned sources', () => {
    expect(ragBadge('rag-ready', 3)).toBe(1);
  });

  it('returns 2 when RAG reports ready but hands back no sources', () => {
    expect(ragBadge('rag-ready', 0)).toBe(2);
  });

  it('treats the advice route richer statuses as protocol-backed', () => {
    expect(ragBadge('rag-ready-with-warning', 2)).toBe(1);
  });

  it.each(['fallback', 'unavailable', 'rag-empty', 'rag-job-timeout', 'llm-direct-no-rag'])(
    'returns 2 for status %s',
    (status) => {
      expect(ragBadge(status, 5)).toBe(2);
    },
  );

  it('returns 2 when the status is missing', () => {
    expect(ragBadge(undefined, 4)).toBe(2);
    expect(ragBadge(null, 4)).toBe(2);
  });
});

describe('formatElapsedSeconds', () => {
  it('rounds to whole seconds above one second', () => {
    expect(formatElapsedSeconds(42_400)).toBe('42');
  });

  it('keeps one decimal below a second', () => {
    expect(formatElapsedSeconds(650)).toBe('0.7');
  });

  it('returns null for missing or non-positive values', () => {
    expect(formatElapsedSeconds(undefined)).toBeNull();
    expect(formatElapsedSeconds(0)).toBeNull();
    expect(formatElapsedSeconds(Number.NaN)).toBeNull();
  });
});
