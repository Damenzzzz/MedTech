import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/layout/site-header';
import { PatientAssistant } from '@/components/patient-portal/patient-assistant';
import { getCurrentSession } from '@/lib/auth/session-role.server';

export default async function PatientAssistantPage({
  params,
}: {
  params: Promise<{ locale: string; iin: string }>;
}) {
  const { locale, iin } = await params;
  setRequestLocale(locale);

  // Same gate as the portal page: the owning patient, or a doctor.
  const session = await getCurrentSession();
  if (!session || (session.role === 'patient' && session.iin !== iin)) {
    redirect(`/${locale}/patient-portal`);
  }

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PatientAssistant />
      </main>
    </div>
  );
}
