import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { RoleSelect } from '@/components/patient-portal/role-select';

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <RoleSelect />
      </main>
    </div>
  );
}
