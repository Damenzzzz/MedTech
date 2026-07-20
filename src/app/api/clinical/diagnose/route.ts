import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DiagnoseInputSchema = z.object({
  symptoms: z.string().trim().min(1, 'symptoms_required').max(4000, 'symptoms_too_long'),
  locale: z.enum(['ru', 'kk', 'en']).optional().default('ru'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = DiagnoseInputSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'invalid_request', details: parseResult.error.issues },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { symptoms } = parseResult.data;
    const base = process.env.RAG_SERVICE_URL;

    if (base) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(`${base.replace(/\/$/, '')}/diagnose`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ symptoms }),
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
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('[Clinical API] RAG fetch failed or timed out:', err instanceof Error ? err.name : 'UnknownError');
      }
    }

    // OpenAI Fallback if RAG service unavailable
    const fallbackData = await openAiClinicalFallback(symptoms);
    return NextResponse.json(
      {
        ...fallbackData,
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

async function openAiClinicalFallback(symptoms: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !symptoms.trim()) {
    return emptyResponse();
  }

  const prompt = `Ты клинический AI-assistant. Сформируй осторожный дифференциально-диагностический ряд по тексту.
Правила:
- Supporting findings должны содержать подтверждающие слова пациента (patient_evidence).
- Не выдумывай источники протоколов.
- Качество confidence: "high" | "medium" | "low".

Симптомы:
${symptoms}

Верни JSON строго вида:
{"case_id":"fallback-session","diagnoses":[{"rank":1,"diagnosis":"...","icd10_code":"...","confidence":"high|medium|low","why_this_diagnosis":"...","supporting_findings":[{"finding":"...","patient_evidence":"..."}],"missing_findings":["..."],"recommended_checks":["..."]}],"follow_up_questions":[{"question":"...","target_diagnoses":["..."],"rationale":"..."}]}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CLINICAL_MODEL ?? 'gpt-5.5',
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2600,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!response.ok) return emptyResponse();
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return emptyResponse();
  }
}

function emptyResponse() {
  return { case_id: 'fallback-session', diagnoses: [], follow_up_questions: [] };
}
