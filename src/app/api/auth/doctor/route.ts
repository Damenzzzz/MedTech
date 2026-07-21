import 'server-only';
import { NextResponse } from 'next/server';
import { DoctorEntrySchema } from '@/domain/schemas';
import { findOrCreateDoctorByName } from '@/lib/db/doctors.server';
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName } = DoctorEntrySchema.parse(body);

    const doctor = await findOrCreateDoctorByName(fullName);
    const token = await signSession({ role: 'doctor', doctorId: doctor.id });

    const response = NextResponse.json({ doctorId: doctor.id });
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error('[auth/doctor route error]', error);
    return NextResponse.json({ error: 'Не удалось выполнить вход' }, { status: 400 });
  }
}
