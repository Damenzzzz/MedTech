'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-md space-y-5">
        <div className="grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600 mx-auto">
          <AlertTriangle size={32} />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900">
          Произошла ошибка системы
        </h1>

        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          Произошла непредвиденная ошибка при загрузке данных. Вы можете попробовать повторить попытку.
        </p>

        <button
          onClick={() => reset()}
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-bold text-xs text-white shadow-sm hover:bg-teal-700 transition-all"
        >
          <RotateCcw size={16} />
          <span>{t('retry')}</span>
        </button>
      </div>
    </div>
  );
}
