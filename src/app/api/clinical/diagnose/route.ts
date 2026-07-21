import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateAlemClinicalFallback,
  normalizeDiagnoseResponse,
} from '@/lib/ai/clinical-service.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DiagnoseInputSchema = z.object({
  symptoms: z.string().trim().min(1, 'Введите симптомы пациента').max(5000, 'Длина симптомов не более 5000 символов'),
});

export async function POST(request: Request) {
  const requestId = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'x-request-id': requestId,
  };

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = DiagnoseInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Поле symptoms с описанием симптомов обязательно.',
          code: 'INVALID_INPUT',
          details: parseResult.error.issues,
          request_id: requestId,
        },
        { status: 400, headers },
      );
    }

    const { symptoms } = parseResult.data;
    const base = process.env.RAG_SERVICE_URL;

    if (base) {
      try {
        const jobResult = await diagnoseViaJob(base, { symptoms }, requestId);
        if (jobResult) {
          const normalized = normalizeDiagnoseResponse(jobResult as Record<string, unknown>, requestId);
          return NextResponse.json(normalized, { headers });
        }

        const rootUrl = base.replace(/\/$/, '');
        const response = await fetch(`${rootUrl}/diagnose`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ symptoms }),
          cache: 'no-store',
          signal: AbortSignal.timeout(180000), // 3 min timeout for deep Python RAG pipeline
        });

        if (response.ok) {
          const ragData = (await response.json()) as Record<string, unknown>;
          const normalized = normalizeDiagnoseResponse(ragData, requestId);
          return NextResponse.json(normalized, { headers });
        }

        console.error('[clinical diagnose route]', { requestId, status: response.status, msg: 'Python RAG service error' });
      } catch (err) {
        console.error('[clinical diagnose route]', { requestId, msg: 'Python RAG service unreachable or timed out', err: err instanceof Error ? err.message : String(err) });
      }

      return NextResponse.json(
        {
          error: 'RAG-сервис не вернул результат. Ответ без протоколов отключён, чтобы не маскировать проблему.',
          code: 'RAG_UNAVAILABLE',
          rag_status: 'unavailable',
          sources: [],
          request_id: requestId,
        },
        { status: 504, headers },
      );
    }

    // Explicit fallback only when no RAG service is configured at all.
    const fallbackResponse = await generateAlemClinicalFallback(symptoms, requestId);
    return NextResponse.json(fallbackResponse, { headers });
  } catch (error) {
    console.error('[clinical diagnose fatal error]', { requestId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка выполнения клинической диагностики',
        code: 'DIAGNOSE_FAILED',
        request_id: requestId,
      },
      { status: 500, headers },
    );
  }
}

async function diagnoseViaJob(base: string, body: unknown, requestId: string) {
  const root = base.replace(/\/$/, '');
  try {
    const start = await fetch(`${root}/api/diagnose-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!start.ok) return null;
    const started = (await start.json()) as { job_id?: string; result?: unknown };
    if (started.result) return started.result;
    if (!started.job_id) return null;

    const deadline = Date.now() + 185000;
    while (Date.now() < deadline) {
      await sleep(3500);
      const statusResponse = await fetch(`${root}/api/diagnose-jobs/${started.job_id}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!statusResponse.ok) continue;
      const status = (await statusResponse.json()) as { status?: string; result?: unknown };
      if (status.status === 'completed' && status.result) return status.result;
      if (status.status === 'failed' || status.status === 'not_found') {
        console.error('[diagnoseViaJob]', { requestId, status: status.status });
        return null;
      }
    }
  } catch (err) {
    console.error('[diagnoseViaJob error]', { requestId, err: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
