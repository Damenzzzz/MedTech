import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/layout/site-header';
import { DoctorPatientDashboard } from '@/components/dashboard/doctor-patient-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session.server';
import { listDoctorPatients } from '@/lib/db/encounters.server';

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'doctor') redirect(`/${locale}/patient-portal`);
  const patients = await listDoctorPatients(session.doctorId);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <DoctorPatientDashboard patients={patients} locale={locale} />
      </main>
    </>
  );
}
