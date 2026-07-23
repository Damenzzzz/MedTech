import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { RoleSelect } from '@/components/patient-portal/role-select';

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header variant="minimal" />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-10">
          <div className="space-y-3 text-center">
            <p className="label text-[#1A5FD0]">{t('introEyebrow')}</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {t('introTitle')}
            </h1>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-300">
              {t('introText')}
            </p>
          </div>

          {/* The intro heading above is the page h1, so the role picker steps down. */}
          <RoleSelect headingLevel="h2" />
        </div>
      </main>
    </div>
  );
}
