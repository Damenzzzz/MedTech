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

  // A patient row may not exist yet (first visit, no encounter recorded). That is not
  // an error for the owning patient — the portal renders an empty state instead.
  // Doctors are still gated by the encounter check below, which cannot match when
  // the patient has no encounters at all.
  const patient = await getPatientByIin(iin);
  const encounters = await listEncountersByPatient(iin);
  if (session.role === 'doctor' && !encounters.some((encounter) => encounter.doctor_id === session.doctorId)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header />
      <main className="flex-1">
        <PatientProfileView patient={patient} iin={iin} encounters={encounters} locale={locale} />
      </main>
    </div>
  );
}
