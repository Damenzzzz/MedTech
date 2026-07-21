import 'server-only';
import { z } from 'zod';
import { getCaseRepository } from '@/repositories/index.server';
import { LlmPatientEngine } from '@/engines/llm-patient-engine.server';
import { MockPatientEngine } from '@/engines/mock-patient-engine.server';
import { getLlmProvider } from '@/lib/ai/provider-config.server';
import { NextResponse } from 'next/server';

/**
 * Simulator respond route.
 * This is now a thin adapter over the shared PatientEngine.
 *
 * The client sends ONLY: caseId, message, locale, dialogue (student/patient text only), revealedFactIds.
 * NO ground truth, hidden context, diagnosis, or system prompts from client.
 */

const SimRequestSchema = z.object({
  caseId: z.string().min(1),
  message: z.string().trim().min(1).max(500),
  locale: z.enum(['ru', 'kk', 'en']).default('ru'),
  dialogue: z.array(z.object({
    role: z.enum(['student', 'patient']),
    text: z.string().max(900),
  })).default([]),
  revealedFactIds: z.array(z.string()).default([]),
});

// Legacy support: also accept old format with caseContext.id or speaker roles
const LegacyRequestSchema = z.object({
  caseContext: z.object({ id: z.string() }).passthrough().optional(),
  caseId: z.string().optional(),
  message: z.string().optional(),
  dialogue: z.array(z.object({
    speaker: z.enum(['doctor', 'patient']).optional(),
    role: z.enum(['student', 'patient']).optional(),
    text: z.string(),
  })).default([]),
}).passthrough();

export async function POST(request: Request) {
  const requestId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const raw = await request.json();

    // Try new format first, then legacy
    let caseId: string;
    let message: string;
    let locale: 'ru' | 'kk' | 'en' = 'ru';
    let dialogue: { role: 'student' | 'patient'; text: string }[] = [];
    let revealedFactIds: string[] = [];

    const newFormat = SimRequestSchema.safeParse(raw);
    if (newFormat.success) {
      ({ caseId, message, locale, dialogue, revealedFactIds } = newFormat.data);
    } else {
      // Legacy format: extract what we can
      const legacy = LegacyRequestSchema.parse(raw);
      caseId = legacy.caseId ?? legacy.caseContext?.id ?? '';
      if (!caseId) {
        return NextResponse.json(
          { error: 'caseId is required', requestId },
          { status: 400 },
        );
      }
      // Extract last doctor message as the question
      const legacyDialogue = legacy.dialogue ?? [];
      const lastDoctor = [...legacyDialogue].reverse().find(
        (t) => t.speaker === 'doctor' || t.role === 'student',
      );
      message = legacy.message ?? lastDoctor?.text ?? '';
      if (!message) {
        return NextResponse.json(
          { error: 'message is required', requestId },
          { status: 400 },
        );
      }
      // Normalize dialogue roles
      dialogue = legacyDialogue.map((t) => ({
        role: (t.speaker === 'doctor' || t.role === 'student') ? 'student' as const : 'patient' as const,
        text: t.text,
      }));
    }

    // Verify case exists on server
    const caseItem = await getCaseRepository().getStudentCase(caseId);
    if (!caseItem) {
      return NextResponse.json(
        { error: 'case_not_found', requestId },
        { status: 404 },
      );
    }

    const provider = getLlmProvider();
    let engineMode: 'llm' | 'deterministic-fallback' = provider === 'alem' ? 'llm' : 'deterministic-fallback';

    const input = {
      caseId,
      message,
      locale,
      dialogue: dialogue.slice(-12),
      revealedFactIds,
    };

    let result;
    try {
      if (provider === 'alem') {
        result = await new LlmPatientEngine().respond(input);
      } else {
        result = await new MockPatientEngine().respond(input);
        engineMode = 'deterministic-fallback';
      }
    } catch {
      result = await new MockPatientEngine().respond(input);
      engineMode = 'deterministic-fallback';
    }

    return NextResponse.json({
      answer: result.answer,
      intent: result.intent,
      revealedFactIds: result.revealedFactIds,
      newFactIds: result.newFactIds,
      visualState: result.visualState,
      engineMode,
      provider,
      requestId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'invalid_request', requestId },
      { status: 400 },
    );
  }
}
