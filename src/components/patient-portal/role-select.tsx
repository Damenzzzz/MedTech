'use client';

import { useTranslations } from 'next-intl';
import { Stethoscope, UserRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function RoleSelect() {
  const t = useTranslations('PatientPortal');

  return (
    <div className="w-full max-w-3xl">
      <p className="label text-center text-teal-700">{t('hubEyebrow')}</p>
      <h1 className="mt-3 text-center text-3xl font-semibold">{t('hubTitle')}</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-300">
        {t('hubLead')}
      </p>

      <div className="mt-9 grid gap-6 sm:grid-cols-2">
        <Link
          href="/patient-portal/doctor"
          className="card group flex flex-col items-center gap-4 rounded-3xl p-8 text-center transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="grid size-16 place-items-center rounded-2xl bg-teal-600 text-white shadow-sm shadow-teal-600/30">
            <Stethoscope size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t('doctorCardTitle')}</h2>
          <p className="text-sm text-slate-600">{t('doctorCardLead')}</p>
        </Link>

        <Link
          href="/patient-portal/patient"
          className="card group flex flex-col items-center gap-4 rounded-3xl p-8 text-center transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="grid size-16 place-items-center rounded-2xl bg-cyan-700 text-white shadow-sm shadow-cyan-700/30">
            <UserRound size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t('patientCardTitle')}</h2>
          <p className="text-sm text-slate-600">{t('patientCardLead')}</p>
        </Link>
      </div>
    </div>
  );
}
