import { getTranslations } from 'next-intl/server';
import type { Encounter, Patient } from '@/lib/db/types';

export async function PatientProfileView({
  patient,
  encounters,
  locale,
}: {
  patient: Patient;
  encounters: Encounter[];
  locale: string;
}) {
  const t = await getTranslations('PatientPortal');

  const statusLabel: Record<Encounter['status'], string> = {
    draft: t('statusDraft'),
    edited: t('statusEdited'),
    final: t('statusFinal'),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="card rounded-3xl p-7">
        <p className="label text-teal-700">{t('profileEyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {patient.full_name || t('profileNoName')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('profileIinLabel')}: {patient.iin}
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">{t('profileHistoryTitle')}</h2>
        {encounters.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t('profileNoEncounters')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {encounters.map((encounter) => (
              <li
                key={encounter.id}
                className="card flex items-center justify-between rounded-2xl p-4"
              >
                <span className="text-sm font-semibold text-slate-800">
                  {new Date(encounter.created_at).toLocaleDateString(locale)}
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                  {statusLabel[encounter.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
