import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { RoleGateway } from '@/components/patient-portal/role-gateway';

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PatientPortal');

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header variant="minimal" />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <RoleGateway eyebrow={t('hubEyebrow')} title={t('hubTitle')} lead={t('hubLead')} />
      </main>
    </div>
  );
}
