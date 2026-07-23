import { CalendarDays, ChevronRight, FileText, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { DoctorPatientSummary } from '@/lib/db/encounters.server';

export async function DoctorPatientDashboard({ patients, locale }: { patients: DoctorPatientSummary[]; locale: string }) {
  const t = await getTranslations('DoctorDashboard');
  const totalEncounters = patients.reduce((sum, p) => sum + p.encounterCount, 0);
  const lastVisit =
    patients.length > 0
      ? new Date(Math.max(...patients.map((p) => new Date(p.lastEncounterAt).getTime())))
      : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#1A5FD0]">{t('eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-[26px]">{t('title')}</h1>
        <p className="mt-1 text-[13.5px] text-[var(--text-secondary)]">{t('lead')}</p>
      </div>

      {patients.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label={t('patientsLabel')} value={String(patients.length)} />
          <StatCard label={t('totalEncountersLabel')} value={String(totalEncounters)} />
          <StatCard
            label={t('lastVisitLabel')}
            value={lastVisit ? lastVisit.toLocaleDateString(locale) : '—'}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )}

      {patients.length === 0 ? (
        <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-10 text-center shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
          <Users className="mx-auto text-[#1F6FEB]" size={34} />
          <h2 className="mt-4 font-bold text-[var(--text-primary)]">{t('emptyTitle')}</h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">{t('emptyLead')}</p>
          <Link
            href="/ai-assistant"
            className="focus-ring mt-5 inline-flex h-11 items-center rounded-xl bg-[#1F6FEB] px-5 text-sm font-semibold text-white hover:bg-[#1A5FD0]"
          >
            {t('openEncounter')}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
          {patients.map((patient) => (
            <Link
              key={patient.iin}
              href={`/patient-portal/${patient.iin}`}
              className="group flex items-center gap-3.5 border-t border-[var(--border-color)] px-4 py-3.5 transition-colors first:border-t-0 hover:bg-[#F4F7FB] sm:px-5"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(31,111,235,0.08)] text-[#1F6FEB]">
                <Users size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-[var(--text-primary)]">
                  {patient.fullName || t('noName')}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--text-tertiary)]">
                  {t('iin')}: {patient.iin}
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-4 text-xs font-medium text-[var(--text-secondary)] sm:flex">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-[#1F6FEB]" />
                  {new Date(patient.lastEncounterAt).toLocaleDateString(locale)}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="text-[#1F6FEB]" />
                  {t('encounterCount', { count: patient.encounterCount })}
                </span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)] ${className}`}
    >
      <div className="text-xs font-semibold text-[var(--text-secondary)]">{label}</div>
      <div className="mono mt-1.5 text-[28px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
    </div>
  );
}
