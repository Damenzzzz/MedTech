import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { HomeView } from '@/components/home/home-view';

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex flex-col">
      <Header />
      <main className="flex-1">
        <HomeView />
      </main>
    </div>
  );
}
