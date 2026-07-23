import { CalendarDays, FileText, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { DoctorPatientSummary } from '@/lib/db/encounters.server';

export async function DoctorPatientDashboard({ patients, locale }: { patients: DoctorPatientSummary[]; locale: string }) {
  const t = await getTranslations('DoctorDashboard');
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#1A5FD0]">{t('eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">{t('title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('lead')}</p>
      </div>
      {patients.length === 0 ? (
        <div className="glass p-10 text-center">
          <Users className="mx-auto text-[#1F6FEB]" size={34} />
          <h2 className="mt-4 font-bold text-[var(--text-primary)]">{t('emptyTitle')}</h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">{t('emptyLead')}</p>
          <Link href="/ai-assistant" className="mt-5 inline-flex rounded-xl bg-[#1F6FEB] px-5 py-3 text-sm font-bold text-white hover:bg-[#1A5FD0]">{t('openEncounter')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Link key={patient.iin} href={`/patient-portal/${patient.iin}`} className="glass p-5 transition hover:-translate-y-0.5 hover:border-[#7CA9F2] hover:shadow-md">
              <h2 className="font-bold text-[var(--text-primary)]">{patient.fullName || t('noName')}</h2>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">{t('iin')}: {patient.iin}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#1F6FEB]" />{new Date(patient.lastEncounterAt).toLocaleDateString(locale)}</span>
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-[#1F6FEB]" />{t('encounterCount', { count: patient.encounterCount })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
