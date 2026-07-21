import { Header } from '@/components/layout/header';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { getCaseRepository } from '@/repositories/index.server';

export default async function Dashboard() {
  const cases = await getCaseRepository().listStudentCases();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <DashboardView cases={cases} />
      </main>
    </>
  );
}
