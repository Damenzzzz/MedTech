'use client';

import { useTranslations } from 'next-intl';
import { Stethoscope, UserRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * `headingLevel` keeps the document outline valid: the component owns the page
 * heading when it stands alone at /patient-portal, but sits under the intro
 * heading when embedded in the landing page.
 */
export function RoleSelect({ headingLevel = 'h1' }: { headingLevel?: 'h1' | 'h2' } = {}) {
  const t = useTranslations('PatientPortal');
  const Heading = headingLevel;

  return (
    <div className="w-full max-w-3xl" style={{ animation: 'fadeUp 0.5s ease-out' }}>
      <p className="label text-center">{t('hubEyebrow')}</p>
      <Heading className="mt-3 text-center text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {t('hubTitle')}
      </Heading>
      <p className="mx-auto mt-3 max-w-xl text-center text-[var(--text-secondary)]">
        {t('hubLead')}
      </p>

      <div className="mt-9 grid gap-6 sm:grid-cols-2">
        <Link
          href="/patient-portal/doctor"
          className="glass group flex flex-col items-center gap-4 p-8 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
        >
          <div className="brand-mark grid size-16 place-items-center rounded-2xl shadow-[0_8px_18px_-4px_rgba(31,111,235,0.5)]">
            <Stethoscope size={28} />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('doctorCardTitle')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{t('doctorCardLead')}</p>
        </Link>

        <Link
          href="/patient-portal/patient"
          className="glass group flex flex-col items-center gap-4 p-8 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
        >
          <div className="grid size-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#12B5A6,#1FB6D0)] text-white shadow-[0_8px_18px_-4px_rgba(18,181,166,0.5)]">
            <UserRound size={28} />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('patientCardTitle')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{t('patientCardLead')}</p>
        </Link>
      </div>
    </div>
  );
}
