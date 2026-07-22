export type RagBadgeValue = 1 | 2;

/**
 * Tells apart an answer grounded in the protocol base from a plain model
 * generation.
 *
 * `1` — the RAG pipeline completed *and* returned protocol sources.
 * `2` — anything else: `fallback`, `unavailable`, `rag-empty`, or a "ready"
 *       status that came back without a single source, which in practice means
 *       the LLM wrote the answer on its own.
 *
 * `startsWith` covers the advice route, which reports richer strings such as
 * `rag-ready-with-warning`.
 */
export function ragBadge(ragStatus: string | null | undefined, sourcesCount: number): RagBadgeValue {
  if (!ragStatus) return 2;
  return ragStatus.startsWith('rag-ready') && sourcesCount > 0 ? 1 : 2;
}

/** Whole seconds, for the "Время обработки: Xс" caption. */
export function formatElapsedSeconds(elapsedMs: number | null | undefined): string | null {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return null;
  return elapsedMs < 1000 ? (elapsedMs / 1000).toFixed(1) : String(Math.round(elapsedMs / 1000));
}
