import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileText,
  MessageCircleHeart,
  Send,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { EncounterWithDoctor } from '@/lib/db/encounters.server';
import type { Encounter, Patient } from '@/lib/db/types';

export async function PatientProfileView({
  patient,
  iin,
  encounters,
  locale,
}: {
  patient: Patient | null;
  iin: string;
  encounters: EncounterWithDoctor[];
  locale: string;
}) {
  const t = await getTranslations('PatientPortal');

  const statusLabel: Record<Encounter['status'], string> = {
    draft: t('statusDraft'),
    edited: t('statusEdited'),
    final: t('statusFinal'),
  };

  const summaries = encounters.map(summarizeEncounter);
  const formatDate = (value: string) => new Date(value).toLocaleString(locale);
  const doctorName = (value: string) => value || t('labelDoctorUnknown');

  // flatMap over a nullable field so TypeScript narrows it inside the section below.
  const diagnoses = summaries.flatMap((entry) =>
    entry.diagnosis ? [{ ...entry, diagnosis: entry.diagnosis }] : [],
  );

  const referralGroups = summaries.flatMap((entry) => {
    const items = [
      ...entry.referrals.map((label) => ({ label, kind: 'referral' as const })),
      ...entry.investigations.map((label) => ({ label, kind: 'investigation' as const })),
    ];
    return items.length > 0 ? [{ entry, items }] : [];
  });

  const adviceGroups = summaries.filter(
    (entry) =>
      entry.clinicalSummary.length > 0 ||
      entry.followUp.length > 0 ||
      entry.safetyNetting.length > 0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="card rounded-3xl p-7">
        <p className="label text-teal-700">{t('profileEyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {patient?.full_name || t('profileNoName')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('profileIinLabel')}: {patient?.iin || iin}
        </p>
      </div>

      {/* Visit-preparation assistant CTA */}
      <section className="card mt-6 rounded-3xl border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-700">
              <MessageCircleHeart size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('assistantCtaTitle')}</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{t('assistantCtaLead')}</p>
            </div>
          </div>

          <Link
            href={`/patient-portal/${iin}/assistant`}
            className="focus-ring inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700"
          >
            <span>{t('assistantCtaButton')}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {encounters.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-4 rounded-3xl px-6 py-12 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <FileText size={28} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{t('profileEmptyTitle')}</h2>
          <p className="max-w-md text-sm leading-6 text-slate-600">{t('profileEmptyLead')}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* 1 — Diagnoses */}
          <SectionCard icon={<Stethoscope size={22} />} title={t('sectionDiagnosesTitle')}>
            {diagnoses.length === 0 ? (
              <NoData label={t('sectionDiagnosesEmpty')} />
            ) : (
              <ul className="space-y-3">
                {diagnoses.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.diagnosis.name || t('labelNoDiagnosis')}
                        </p>
                        {entry.diagnosis.code && (
                          <p className="mt-1 inline-flex rounded-lg bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                            {t('labelIcd')}: {entry.diagnosis.code}
                          </p>
                        )}
                      </div>
                      <StatusBadge label={statusLabel[entry.status]} />
                    </div>
                    <MetaLine
                      className="mt-3"
                      date={formatDate(entry.createdAt)}
                      doctorLabel={t('labelDoctor')}
                      doctorName={doctorName(entry.doctorName)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* 2 — Referrals and ordered investigations */}
          <SectionCard icon={<Send size={22} />} title={t('sectionReferralsTitle')}>
            {referralGroups.length === 0 ? (
              <NoData label={t('sectionReferralsEmpty')} />
            ) : (
              <ul className="space-y-3">
                {referralGroups.map(({ entry, items }) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                  >
                    <MetaLine
                      date={formatDate(entry.createdAt)}
                      doctorLabel={t('labelDoctor')}
                      doctorName={doctorName(entry.doctorName)}
                    />
                    <ul className="mt-3 space-y-2">
                      {items.map((item, index) => (
                        <li
                          key={`${entry.id}-${index}-${item.label}`}
                          className="flex flex-wrap items-center gap-2 text-sm text-slate-700"
                        >
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                              item.kind === 'referral'
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-cyan-50 text-cyan-700'
                            }`}
                          >
                            {item.kind === 'referral'
                              ? t('kindReferral')
                              : t('kindInvestigation')}
                          </span>
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* 3 — Summaries, follow-up and safety netting */}
          <SectionCard icon={<ClipboardList size={22} />} title={t('sectionAdviceTitle')}>
            {adviceGroups.length === 0 ? (
              <NoData label={t('sectionAdviceEmpty')} />
            ) : (
              <ul className="space-y-3">
                {adviceGroups.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                  >
                    <MetaLine
                      date={formatDate(entry.createdAt)}
                      doctorLabel={t('labelDoctor')}
                      doctorName={doctorName(entry.doctorName)}
                    />
                    {entry.clinicalSummary && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {entry.clinicalSummary}
                      </p>
                    )}
                    {entry.followUp.length > 0 && (
                      <LabelledList
                        icon={<CalendarCheck size={15} />}
                        title={t('labelFollowUp')}
                        items={entry.followUp}
                      />
                    )}
                    {entry.safetyNetting.length > 0 && (
                      <LabelledList
                        icon={<ShieldAlert size={15} />}
                        title={t('labelSafetyNetting')}
                        items={entry.safetyNetting}
                        tone="amber"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Full encounter history with the complete protocol behind a disclosure */}
          <section>
            <h2 className="text-lg font-bold text-slate-900">{t('profileHistoryTitle')}</h2>
            <ul className="mt-4 space-y-3">
              {summaries.map((entry) => (
                <li key={entry.id} className="card rounded-2xl p-4">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatDate(entry.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('labelDoctor')}: {doctorName(entry.doctorName)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDiagnosis(entry.diagnosis) || t('labelNoDiagnosis')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={statusLabel[entry.status]} />
                        <span className="text-xs font-semibold text-teal-700">
                          {t('detailsToggle')}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        {t('protocolFullTitle')}
                      </h3>
                      <ProtocolReadOnly protocol={entry.protocol} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Presentation helpers
 * ---------------------------------------------------------------- */

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card rounded-3xl p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NoData({ label }: { label: string }) {
  return <p className="text-sm text-slate-500">{label}</p>;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
      {label}
    </span>
  );
}

function MetaLine({
  date,
  doctorLabel,
  doctorName,
  className = '',
}: {
  date: string;
  doctorLabel: string;
  doctorName: string;
  className?: string;
}) {
  return (
    <p className={`text-xs font-medium text-slate-500 ${className}`}>
      {date} · {doctorLabel}: {doctorName}
    </p>
  );
}

function LabelledList({
  icon,
  title,
  items,
  tone = 'teal',
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone?: 'teal' | 'amber';
}) {
  const toneClass = tone === 'amber' ? 'text-amber-700' : 'text-teal-700';
  return (
    <div className="mt-4">
      <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${toneClass}`}>
        {icon}
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

async function ProtocolReadOnly({ protocol }: { protocol: Record<string, unknown> | null }) {
  const t = await getTranslations('PatientPortal');

  if (!protocol) {
    return <p className="mt-2 text-sm text-slate-500">{t('protocolMissing')}</p>;
  }

  const sections = readRecord(protocol, 'sections');
  const assessment = readRecord(sections, 'assessment');
  const plan = readRecord(sections, 'plan');

  const summary = readText(assessment, 'clinicalSummary');
  const vitals = readVitalSigns(sections);
  const blocks: Array<{ title: string; items: string[] }> = [
    { title: t('protocolComplaints'), items: readTextList(sections, 'chiefComplaints') },
    { title: t('protocolObjective'), items: readTextList(sections, 'objectiveFindings') },
    { title: t('protocolRedFlags'), items: readTextList(sections, 'redFlags') },
    { title: t('protocolInvestigations'), items: readTextList(plan, 'investigations') },
    { title: t('protocolTreatment'), items: readTextList(plan, 'treatmentDraft') },
    { title: t('protocolReferrals'), items: readTextList(plan, 'referrals') },
    { title: t('protocolFollowUp'), items: readTextList(plan, 'followUp') },
    { title: t('protocolSafetyNetting'), items: readTextList(plan, 'safetyNetting') },
    { title: t('protocolQuestions'), items: readTextList(sections, 'unresolvedQuestions') },
  ].filter((block) => block.items.length > 0);

  const history = readText(readRecord(sections, 'historyOfPresentIllness'), 'text');

  if (!summary && !history && vitals.length === 0 && blocks.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">{t('protocolEmpty')}</p>;
  }

  return (
    <div className="mt-3 space-y-4 text-sm leading-6 text-slate-700">
      {summary && <p className="whitespace-pre-wrap">{summary}</p>}

      {history && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            {t('protocolHistory')}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{history}</p>
        </div>
      )}

      {vitals.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700">
            <Activity size={14} />
            {t('protocolVitals')}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {vitals.map((vital, index) => (
              <li
                key={`${index}-${vital.name}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                {vital.name}: {vital.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocks.map((block) => (
        <div key={block.title}>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{block.title}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {block.items.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Protocol readers — the stored protocol is untyped JSON, so every
 * field is narrowed through a guard instead of being cast.
 * ---------------------------------------------------------------- */

type EncounterSummary = {
  id: string;
  createdAt: string;
  doctorName: string;
  status: Encounter['status'];
  diagnosis: { name: string; code: string } | null;
  clinicalSummary: string;
  investigations: string[];
  referrals: string[];
  followUp: string[];
  safetyNetting: string[];
  protocol: Record<string, unknown> | null;
};

function summarizeEncounter(encounter: EncounterWithDoctor): EncounterSummary {
  const sections = readRecord(encounter.protocol, 'sections');
  const assessment = readRecord(sections, 'assessment');
  const plan = readRecord(sections, 'plan');
  const preliminary = readRecord(assessment, 'preliminaryDiagnosis');

  const name = readText(preliminary, 'diagnosis');
  const code = readText(preliminary, 'icd10Code');

  return {
    id: encounter.id,
    createdAt: encounter.created_at,
    doctorName: encounter.doctors?.full_name?.trim() ?? '',
    status: encounter.status,
    diagnosis: name || code ? { name, code } : null,
    clinicalSummary: readText(assessment, 'clinicalSummary'),
    investigations: readTextList(plan, 'investigations'),
    referrals: readTextList(plan, 'referrals'),
    followUp: readTextList(plan, 'followUp'),
    safetyNetting: readTextList(plan, 'safetyNetting'),
    protocol: encounter.protocol,
  };
}

function formatDiagnosis(diagnosis: { name: string; code: string } | null) {
  return diagnosis ? [diagnosis.name, diagnosis.code].filter(Boolean).join(' · ') : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return isRecord(value) ? value : null;
}

function readText(source: Record<string, unknown> | null, key: string): string {
  const value = source?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Reads both plain `string[]` plan entries and `{ text, sourceQuotes }[]`
 * protocol items into a flat list of non-empty strings.
 */
function readTextList(source: Record<string, unknown> | null, key: string): string[] {
  const value = source?.[key];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      const text = item.trim();
      return text ? [text] : [];
    }
    if (isRecord(item)) {
      const text = readText(item, 'text');
      return text ? [text] : [];
    }
    return [];
  });
}

function readVitalSigns(source: Record<string, unknown> | null): Array<{ name: string; value: string }> {
  const value = source?.vitalSigns;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = readText(item, 'name');
    const measurement = readText(item, 'value');
    return name && measurement ? [{ name, value: measurement }] : [];
  });
}
