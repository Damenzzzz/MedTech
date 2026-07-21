import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RefineInputSchema = z.object({
  case_id: z.string().trim().optional(),
  additional_info: z.string().trim().default(''),
  symptoms: z.string().trim().default(''),
  locale: z.enum(['ru', 'kk', 'en']).optional().default('ru'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = RefineInputSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'invalid_request', details: parseResult.error.issues },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { case_id, additional_info, symptoms } = parseResult.data;

    if (!symptoms && !additional_info) {
      return NextResponse.json(
        { error: 'symptoms_or_additional_info_required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const base = process.env.RAG_SERVICE_URL;

    if (base && case_id && case_id !== 'fallback-session') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(`${base.replace(/\/$/, '')}/api/refine`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            case_id,
            additional_info,
            symptoms,
          }),
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const ragData = await response.json();
          const hasSources = Array.isArray(ragData.sources) && ragData.sources.length > 0;
          return NextResponse.json(
            {
              ...ragData,
              sources: ragData.sources || [],
              rag_status: hasSources ? 'rag-ready' : 'rag-empty',
            },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        } else {
          console.error(`[Clinical Refine] RAG service returned status ${response.status}`);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('[Clinical Refine] RAG fetch failed or timed out:', err instanceof Error ? err.name : 'UnknownError');
      }
    }

    // Explicit Fallback mode when case_id not cached in RAG or RAG unavailable
    const fallbackQuery = [symptoms, additional_info].filter(Boolean).join('\nДополнительно: ');
    const fallbackDiagnose = (await import('../diagnose/route')).POST;

    const fallbackReq = new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symptoms: fallbackQuery }),
    });

    const fallbackRes = await fallbackDiagnose(fallbackReq);
    if (!fallbackRes.ok) {
      return NextResponse.json(
        { error: 'refine_failed', rag_status: 'unavailable' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = await fallbackRes.json();
    return NextResponse.json(
      {
        ...data,
        sources: [],
        rag_status: 'fallback',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'internal_error', rag_status: 'unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
