import { CalendarDays, FileText, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { DoctorPatientSummary } from '@/lib/db/encounters.server';

export async function DoctorPatientDashboard({ patients, locale }: { patients: DoctorPatientSummary[]; locale: string }) {
  const t = await getTranslations('DoctorDashboard');
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{t('eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('lead')}</p>
      </div>
      {patients.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <Users className="mx-auto text-teal-600" size={34} />
          <h2 className="mt-4 font-bold text-slate-900">{t('emptyTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('emptyLead')}</p>
          <Link href="/ai-assistant" className="mt-5 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700">{t('openEncounter')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Link key={patient.iin} href={`/patient-portal/${patient.iin}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
              <h2 className="font-bold text-slate-900">{patient.fullName || t('noName')}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('iin')}: {patient.iin}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-teal-600" />{new Date(patient.lastEncounterAt).toLocaleDateString(locale)}</span>
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-teal-600" />{t('encounterCount', { count: patient.encounterCount })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
