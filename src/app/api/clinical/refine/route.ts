import 'server-only';
import { NextResponse } from 'next/server';
import { RefineInputSchema } from '@/domain/schemas';
import {
  generateAlemClinicalFallback,
  normalizeDiagnoseResponse,
} from '@/lib/ai/clinical-service.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = `refine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'x-request-id': requestId,
  };

  try {
    const json = await request.json().catch(() => ({}));
    const parseResult = RefineInputSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Некорректные данные запроса уточнения.',
          code: 'INVALID_INPUT',
          details: parseResult.error.issues,
          request_id: requestId,
        },
        { status: 400, headers },
      );
    }

    const { case_id, additional_info, symptoms } = parseResult.data;

    if (!symptoms && !additional_info) {
      return NextResponse.json(
        {
          error: 'Потребуются либо симптомы, либо дополнительная информация.',
          code: 'EMPTY_REFINE_INPUT',
          request_id: requestId,
        },
        { status: 400, headers },
      );
    }

    const base = process.env.RAG_SERVICE_URL;
    const targetCaseId = case_id || `case-${Date.now()}`;

    if (base && case_id && case_id !== 'fallback-session' && !case_id.startsWith('alem-') && !case_id.startsWith('mock-')) {
      try {
        const rootUrl = base.replace(/\/$/, '');
        const response = await fetch(`${rootUrl}/api/refine`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            case_id: targetCaseId,
            additional_info,
            symptoms,
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(45000), // Adequate timeout for rerank + reasoning
        });

        if (response.ok) {
          const ragData = (await response.json()) as Record<string, unknown>;
          const hasSources = Array.isArray(ragData.sources) && ragData.sources.length > 0;
          const status = hasSources ? 'rag-ready' : 'rag-empty';
          const normalized = normalizeDiagnoseResponse(
            {
              ...ragData,
              case_id: targetCaseId,
            },
            requestId,
            status,
          );

          return NextResponse.json(normalized, { headers });
        }

        console.error('[clinical refine route]', { requestId, status: response.status, msg: 'Python RAG refine returned non-200' });
      } catch (err) {
        console.error('[clinical refine route]', { requestId, msg: 'Python RAG refine fetch failed or timed out', err: err instanceof Error ? err.message : String(err) });
      }
    }

    // Fallback mode via AlemLLM or Mock (NO OpenAI!)
    const combinedQuery = [symptoms, additional_info].filter(Boolean).join('\nДополнительно: ');
    const fallbackData = await generateAlemClinicalFallback(combinedQuery, requestId);

    const result = {
      ...fallbackData,
      case_id: targetCaseId,
      cached_context: false, // Fallback must never mask itself as cached RAG
      rag_status: 'fallback' as const,
    };

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error('[clinical refine fatal error]', { requestId, error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка выполнения уточнения диагноза',
        code: 'REFINE_FAILED',
        rag_status: 'unavailable',
        request_id: requestId,
      },
      { status: 500, headers },
    );
  }
}
