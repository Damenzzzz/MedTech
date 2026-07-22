import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { PatientEntryForm } from '@/components/patient-portal/patient-entry-form';

export default async function PatientEntryPage({
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
        <PatientEntryForm />
      </main>
    </div>
  );
}
