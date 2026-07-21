import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { PatientProfileView } from '@/components/patient-portal/patient-profile-view';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session.server';
import { getPatientByIin } from '@/lib/db/patients.server';
import { listEncountersByPatient } from '@/lib/db/encounters.server';

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ locale: string; iin: string }>;
}) {
  const { locale, iin } = await params;
  setRequestLocale(locale);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || (session.role === 'patient' && session.iin !== iin)) {
    redirect(`/${locale}/patient-portal`);
  }

  const patient = await getPatientByIin(iin);
  if (!patient) {
    redirect(`/${locale}/patient-portal`);
  }

  const encounters = await listEncountersByPatient(iin);
  if (session.role === 'doctor' && !encounters.some((encounter) => encounter.doctor_id === session.doctorId)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header />
      <main className="flex-1">
        <PatientProfileView patient={patient} encounters={encounters} locale={locale} />
      </main>
    </div>
  );
}
