import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCaseRepository } from '@/repositories/index.server';

const PerformExamRequestSchema = z.object({
  caseId: z.string().min(1),
  examinationId: z.string().min(1),
  locale: z.enum(['ru', 'kk', 'en']).default('ru'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = PerformExamRequestSchema.parse(json);

    const groundTruth = await getCaseRepository().getGroundTruth(body.caseId);
    if (!groundTruth) {
      return NextResponse.json({ error: 'case_not_found' }, { status: 404 });
    }

    const exam = groundTruth.examinations.find((e) => e.id === body.examinationId);
    if (!exam) {
      return NextResponse.json({ error: 'examination_not_found' }, { status: 404 });
    }

    const locale = body.locale as 'ru' | 'kk' | 'en';
    const resultText =
      typeof exam.result === 'object'
        ? exam.result[locale] || exam.result.ru
        : exam.result;

    return NextResponse.json({
      id: exam.id,
      result: resultText,
      performedAt: Date.now(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
