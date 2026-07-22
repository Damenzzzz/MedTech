import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { OnboardingView } from '@/components/onboarding/onboarding-view';

export default async function IntroPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header variant="minimal" />
      <main className="flex-1">
        <OnboardingView />
      </main>
    </div>
  );
}
