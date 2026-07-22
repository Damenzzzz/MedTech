import 'server-only';
import { NextResponse } from 'next/server';
import { PatientEntrySchema } from '@/domain/schemas';
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session.server';

// DEMO IDENTIFICATION — NOT AUTHENTICATION.
// A well-formed IIN alone grants a patient session, even when no patient record
// exists yet: anyone who knows (or guesses) an IIN can open that portal. This is
// deliberate for the demo so a first-time patient lands in an empty portal instead
// of a dead end. Never use this flow for real PHI — it needs a password, OTP or
// eGov identity provider first.
export async function POST(request: Request) {
  let iin: string;
  try {
    const body = await request.json();
    ({ iin } = PatientEntrySchema.parse(body));
  } catch (error) {
    console.error('[auth/patient route error]', error);
    return NextResponse.json({ error: 'Некорректный формат ИИН' }, { status: 400 });
  }

  const token = await signSession({ role: 'patient', iin });
  const response = NextResponse.json({ iin });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
