import 'server-only';

/**
 * Single entry point for the Python RAG service.
 *
 * The deployed service only answers through the job endpoint — synchronous
 * POST /diagnose times out in production — so every caller goes through
 * `fetchRagContext`. The sync call survives as a local-development fallback.
 */

export type RagSource = {
  protocol_id?: string;
  title?: string;
  section_type?: string;
  section?: string;
  source_file?: string;
  chunk_id?: string;
  chunk_text?: string;
  text?: string;
  excerpt?: string;
  icd_codes?: string[];
};

export type RagDiagnosis = {
  rank?: number;
  diagnosis?: string;
  icd10_code?: string;
  confidence?: string;
  why_this_diagnosis?: string;
  sources?: RagSource[];
};

export type RagPayload = {
  diagnoses?: RagDiagnosis[];
  sources?: RagSource[];
  case_id?: string;
};

export type RagContext = {
  /** 'rag-ready' only when the pipeline completed; drives the 1/2 badge. */
  status: string;
  result: RagPayload | null;
  elapsedMs: number;
};

const START_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 3500;
const JOB_DEADLINE_MS = 185000;
const SYNC_TIMEOUT_MS = 180000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLocalRag(base: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(base.trim());
}

/** Starts a diagnose job and polls it to completion. Returns null on any failure. */
export async function fetchRagViaJob(base: string, body: { symptoms: string }): Promise<RagPayload | null> {
  const root = base.replace(/\/$/, '');
  try {
    const start = await fetch(`${root}/api/diagnose-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(START_TIMEOUT_MS),
    });
    if (!start.ok) return null;

    const started = (await start.json()) as { job_id?: string; result?: RagPayload };
    if (started.result) return started.result;
    if (!started.job_id) return null;

    const deadline = Date.now() + JOB_DEADLINE_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const statusResponse = await fetch(`${root}/api/diagnose-jobs/${started.job_id}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(START_TIMEOUT_MS),
      });
      if (!statusResponse.ok) continue;

      const status = (await statusResponse.json()) as { status?: string; result?: RagPayload };
      if (status.status === 'completed' && status.result) return status.result;
      if (status.status === 'failed' || status.status === 'not_found') {
        console.error('[rag-job]', { status: status.status });
        return null;
      }
    }
    console.error('[rag-job]', { status: 'timeout' });
  } catch (err) {
    console.error('[rag-job error]', { err: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

/** Synchronous /diagnose — only reachable against a local RAG instance. */
export async function fetchRagSync(base: string, body: { symptoms: string }): Promise<RagPayload | null> {
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/diagnose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as RagPayload;
  } catch {
    return null;
  }
}

/**
 * Job flow first, local sync as fallback. Logs how long the call took so the
 * "1" badge can be verified against real timings instead of guessed.
 */
export async function fetchRagContext(body: { symptoms: string }, label = 'rag'): Promise<RagContext> {
  const base = process.env.RAG_SERVICE_URL;
  const started = Date.now();

  if (!base) {
    return { status: 'rag-not-configured', result: null, elapsedMs: 0 };
  }

  const result = (await fetchRagViaJob(base, body)) ?? (isLocalRag(base) ? await fetchRagSync(base, body) : null);
  const elapsedMs = Date.now() - started;
  const status = result ? 'rag-ready' : 'rag-unavailable';

  console.info('[rag telemetry]', { label, status, elapsedMs, sources: collectRagSources(result).length });
  return { status, result, elapsedMs };
}

/** Flattens top-level and per-diagnosis sources, dropping duplicates. */
export function collectRagSources(result: RagPayload | null): RagSource[] {
  const values = [...(result?.sources ?? []), ...((result?.diagnoses ?? []).flatMap((d) => d.sources ?? []))];
  const seen = new Set<string>();
  return values.filter((source) => {
    const key = source.chunk_id ?? source.protocol_id ?? source.title ?? source.text?.slice(0, 80);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
