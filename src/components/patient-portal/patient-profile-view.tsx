import { getTranslations } from 'next-intl/server';
import type { EncounterWithDoctor } from '@/lib/db/encounters.server';
import type { Encounter, Patient } from '@/lib/db/types';

export async function PatientProfileView({
  patient,
  encounters,
  locale,
}: {
  patient: Patient;
  encounters: EncounterWithDoctor[];
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
            {encounters.map((encounter) => {
              const diagnosis = getDiagnosis(encounter);
              return (
                <li key={encounter.id} className="card rounded-2xl p-4">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{new Date(encounter.created_at).toLocaleString(locale)}</p>
                        <p className="mt-1 text-xs text-slate-500">Врач: {encounter.doctors?.full_name || 'Не указан'}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{diagnosis || 'Диагноз не указан'}</p>
                      </div>
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{statusLabel[encounter.status]}</span>
                    </summary>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-bold text-slate-900">Полный протокол</h3>
                      <ProtocolReadOnly protocol={encounter.protocol} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function getDiagnosis(encounter: Encounter) {
  const protocol = encounter.protocol as { sections?: { assessment?: { preliminaryDiagnosis?: { diagnosis?: unknown; icd10Code?: unknown } } } } | null;
  const item = protocol?.sections?.assessment?.preliminaryDiagnosis;
  const name = typeof item?.diagnosis === 'string' ? item.diagnosis : '';
  const code = typeof item?.icd10Code === 'string' ? item.icd10Code : '';
  return [name, code].filter(Boolean).join(' · ');
}

function ProtocolReadOnly({ protocol }: { protocol: Record<string, unknown> | null }) {
  if (!protocol) return <p className="mt-2 text-sm text-slate-500">Протокол отсутствует.</p>;
  const sections = protocol.sections as Record<string, unknown> | undefined;
  const assessment = sections?.assessment as Record<string, unknown> | undefined;
  const plan = sections?.plan as Record<string, unknown> | undefined;
  const summary = typeof assessment?.clinicalSummary === 'string' ? assessment.clinicalSummary : '';
  const renderList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const planItems = [...renderList(plan?.investigations), ...renderList(plan?.treatmentDraft), ...renderList(plan?.referrals), ...renderList(plan?.followUp), ...renderList(plan?.safetyNetting)];

  return (
    <div className="mt-3 space-y-4 text-sm leading-6 text-slate-700">
      {summary && <p className="whitespace-pre-wrap">{summary}</p>}
      {planItems.length > 0 && <ul className="list-disc space-y-1 pl-5">{planItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}
      {!summary && planItems.length === 0 && <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs">{JSON.stringify(protocol, null, 2)}</pre>}
    </div>
  );
}
