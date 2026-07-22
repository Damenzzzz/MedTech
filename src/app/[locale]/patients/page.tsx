import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/layout/site-header';
import { PatientCatalog } from '@/components/patients/patient-catalog';
import { CatalogSkeleton } from '@/components/patients/catalog-skeleton';
import { getCaseRepository } from '@/repositories/index.server';

export default async function PatientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cases = await getCaseRepository().listStudentCases();

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><CatalogSkeleton /></div>}>
          <PatientCatalog cases={cases} locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
