'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function DoctorEntryForm() {
  const t = useTranslations('PatientPortal');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    fullName: z.string().trim().min(2, t('nameRequired')).max(80, t('nameRequired')),
  });
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const response = await fetch('/api/auth/doctor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      setServerError(t('doctorError'));
      return;
    }

    router.push('/dashboard');
  };

  return (
    <form className="card w-full max-w-md rounded-3xl p-7 sm:p-9" onSubmit={handleSubmit(onSubmit)}>
      <p className="label text-teal-700">{t('doctorEyebrow')}</p>
      <h1 className="mt-3 text-3xl font-semibold">{t('doctorTitle')}</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t('doctorLead')}</p>

      <label className="mt-7 block text-sm font-semibold">
        {t('nameLabel')}
        <input autoFocus className="input mt-2" placeholder={t('namePlaceholder')} {...register('fullName')} />
      </label>
      {errors.fullName && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {errors.fullName.message}
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
