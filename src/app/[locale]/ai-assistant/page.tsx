import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/layout/site-header';
import { ClinicalAIWorkspace } from '@/components/ai/clinical-ai-workspace';
import { getCaseRepository } from '@/repositories/index.server';

export default async function AIAssistantPage({
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
        <ClinicalAIWorkspace cases={cases} locale={locale} />
      </main>
    </div>
  );
}
