import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCaseRepository } from '@/repositories/index.server';

const OrderTestRequestSchema = z.object({
  caseId: z.string().min(1),
  investigationId: z.string().min(1),
  locale: z.enum(['ru', 'kk', 'en']).default('ru'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = OrderTestRequestSchema.parse(json);

    const groundTruth = await getCaseRepository().getGroundTruth(body.caseId);
    if (!groundTruth) {
      return NextResponse.json({ error: 'case_not_found' }, { status: 404 });
    }

    const test = groundTruth.investigations.find((i) => i.id === body.investigationId);
    if (!test) {
      return NextResponse.json({ error: 'investigation_not_found' }, { status: 404 });
    }

    const locale = body.locale as 'ru' | 'kk' | 'en';
    const resultText =
      typeof test.result === 'object'
        ? test.result[locale] || test.result.ru
        : test.result;

    return NextResponse.json({
      id: test.id,
      result: resultText,
      delayMs: test.delayMs,
      orderedAt: Date.now(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
