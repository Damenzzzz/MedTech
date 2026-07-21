'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { IIN_REGEX } from '@/domain/schemas';

export function PatientEntryForm() {
  const t = useTranslations('PatientPortal');
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    iin: z.string().trim().regex(IIN_REGEX, t('iinFormatError')),
  });
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setNotFound(false);
    setServerError(null);

    const response = await fetch('/api/auth/patient', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.status === 404) {
      setNotFound(true);
      return;
    }
    if (!response.ok) {
      setServerError(t('patientError'));
      return;
    }

    const result: { iin: string } = await response.json();
    router.push(`/patient-portal/${result.iin}`);
  };

  return (
    <form className="card w-full max-w-md rounded-3xl p-7 sm:p-9" onSubmit={handleSubmit(onSubmit)}>
      <p className="label text-teal-700">{t('patientEyebrow')}</p>
      <h1 className="mt-3 text-3xl font-semibold">{t('patientTitle')}</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t('patientLead')}</p>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <span>{t('demoNotice')}</span>
      </div>

      <label className="mt-7 block text-sm font-semibold">
        {t('iinLabel')}
        <input
          autoFocus
          inputMode="numeric"
          maxLength={12}
          className="input mt-2"
          placeholder={t('iinPlaceholder')}
          {...register('iin')}
        />
      </label>
      {errors.iin && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {errors.iin.message}
        </p>
      )}
      {notFound && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t('iinNotFound')}
        </p>
      )}
      {serverError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button className="mt-6 w-full" disabled={isSubmitting}>
        {t('submit')}
      </Button>
    </form>
  );
}
