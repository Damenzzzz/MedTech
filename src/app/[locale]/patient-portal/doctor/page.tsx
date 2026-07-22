import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { DoctorEntryForm } from '@/components/patient-portal/doctor-entry-form';

export default async function DoctorEntryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header variant="minimal" />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <DoctorEntryForm />
      </main>
    </div>
  );
}
