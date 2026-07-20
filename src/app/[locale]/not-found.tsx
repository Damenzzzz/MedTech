'use client';

import { Stethoscope, Home } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function NotFound() {

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-md space-y-5">
        <div className="grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-600 mx-auto">
          <Stethoscope size={32} />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900">
          Страница не найдена (404)
        </h1>

        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          Запрошенный клинический маршрут или случай не найден. Проверьте правильность адреса.
        </p>

        <Link
          href="/"
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-bold text-xs text-white shadow-sm hover:bg-teal-700 transition-all"
        >
          <Home size={16} />
          <span>Вернуться на главную</span>
        </Link>
      </div>
    </div>
  );
}
