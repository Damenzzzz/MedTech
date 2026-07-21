import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IIN_REGEX, ProtocolSourceSchema } from '@/domain/schemas';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session.server';
import { createEncounter } from '@/lib/db/encounters.server';
import { upsertPatient } from '@/lib/db/patients.server';

export const dynamic = 'force-dynamic';

const SaveEncounterSchema = z.object({
  patientIin: z.string().trim().regex(IIN_REGEX, 'ИИН должен содержать ровно 12 цифр'),
  patientFullName: z.string().trim().min(2).max(120).optional(),
  rawTranscript: z.string().max(250_000).default(''),
  structuredDialogue: z.array(z.object({
    speaker: z.enum(['doctor', 'patient', 'relative', 'nurse', 'unknown']),
    text: z.string(),
    start: z.number().optional(),
    end: z.number().optional(),
  })).default([]),
  protocol: z.record(z.string(), z.unknown()),
  ragSources: z.array(ProtocolSourceSchema).default([]),
  status: z.enum(['draft', 'edited', 'final']).default('draft'),
});

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'doctor') {
    return NextResponse.json({ error: 'Требуется действующая сессия врача' }, { status: 401 });
  }

  try {
    const input = SaveEncounterSchema.parse(await request.json());
    await upsertPatient({
      iin: input.patientIin,
      ...(input.patientFullName ? { full_name: input.patientFullName } : {}),
    });
    const encounter = await createEncounter({
      patient_iin: input.patientIin,
      doctor_id: session.doctorId,
      raw_transcript: input.rawTranscript || null,
      structured_dialogue: input.structuredDialogue,
      protocol: input.protocol,
      rag_sources: input.ragSources,
      status: input.status,
    });
    return NextResponse.json({ encounterId: encounter.id, patientIin: encounter.patient_iin }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Проверьте данные приёма', details: error.issues }, { status: 400 });
    }
    console.error('[encounters save]', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить приём в Supabase. Черновик сохранён в браузере — повторите попытку позже.' },
      { status: 503 },
    );
  }
}
