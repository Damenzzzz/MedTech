import 'server-only';
import { NextResponse } from 'next/server';
import { PatientEntrySchema } from '@/domain/schemas';
import { getPatientByIin } from '@/lib/db/patients.server';
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session.server';

export async function POST(request: Request) {
  let iin: string;
  try {
    const body = await request.json();
    ({ iin } = PatientEntrySchema.parse(body));
  } catch (error) {
    console.error('[auth/patient route error]', error);
    return NextResponse.json({ error: 'Некорректный формат ИИН' }, { status: 400 });
  }

  const patient = await getPatientByIin(iin);
  if (!patient) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const token = await signSession({ role: 'patient', iin: patient.iin });
  const response = NextResponse.json({ iin: patient.iin });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
