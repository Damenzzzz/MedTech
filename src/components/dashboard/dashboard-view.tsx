'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Target, Flag, ArrowRight, Activity, Sparkles, Award, ShieldAlert, HeartPulse } from 'lucide-react';
import { motion } from 'motion/react';
import type { StudentCaseDTO } from '@/domain/schemas';
import { Link } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

interface DashboardViewProps {
  recommended: StudentCaseDTO;
}

export function DashboardView({ recommended }: DashboardViewProps) {
  const t = useTranslations('Dashboard');
  const navT = useTranslations('Nav');
  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);

  const userName = hydrated && profile?.name ? profile.name : 'Коллега';

  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kms-progress');
      if (saved) {
        setCompletedCount((JSON.parse(saved) as unknown[]).length);
      } else {
        setCompletedCount(6);
      }
    } catch {
      setCompletedCount(6);
    }
  }, []);

  const trend = [54, 62, 59, 71, 78, 84];

  const recName = typeof recommended.title === 'object' ? recommended.title.ru : recommended.title;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          <Sparkles size={14} className="text-teal-600" />
          <span>{navT('greeting', { name: userName })}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {t('title')}
        </h1>

        <p className="text-xs font-medium text-slate-600 max-w-2xl leading-relaxed">
          Ваша личная аналитика прохождения клинических симуляторов и динамика академического прогресса.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Trophy}
          label={t('completed')}
          value={`${completedCount} случаев`}
          trend="+2 за неделю"
          iconBg="bg-teal-100 text-teal-700"
        />

        <MetricCard
          icon={Target}
          label={t('average')}
          value="84%"
          trend="+6% к норме"
          iconBg="bg-emerald-100 text-emerald-700"
        />

        <MetricCard
          icon={Award}
          label={t('strong')}
          value="Неврология"
          trend="92% точность"
          iconBg="bg-purple-100 text-purple-700"
        />

        <MetricCard
          icon={Flag}
          label={t('missedFlags')}
          value="2 флага"
          trend="Внимание"
          warning
          iconBg="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Academic Progress Chart */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-teal-600" />
                <span>{t('trend')}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Динамика итогового балла за 6 последних сессий</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              +18% рост
            </span>
          </div>

          <div className="flex h-48 items-end gap-4 pt-4">
            {trend.map((val, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-2 group">
                <span className="text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {val}%
                </span>
                <div className="w-full max-w-[48px] rounded-t-xl bg-slate-100 overflow-hidden h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${val}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className="w-full bg-gradient-to-t from-teal-600 to-cyan-500 rounded-t-xl group-hover:brightness-110 transition-all"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500">Сессия {idx + 1}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Case Box */}
        <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-emerald-50 to-white p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-800 shadow-xs">
              <Sparkles size={14} className="text-teal-600" />
              <span>{t('recommended')}</span>
            </span>

            <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
              {recName}
            </h2>

            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Специализация: <strong className="text-slate-900 font-bold">{recommended.specialty}</strong> · ~{recommended.durationMinutes} мин
            </p>
          </div>

          <Link
            href={`/training/${recommended.id}`}
            className="focus-ring mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 font-bold text-xs text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.01]"
          >
            <span>{t('start')}</span>
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>

      {/* Recent Attempts Table */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          {t('recent')}
        </h2>

        <div className="divide-y divide-slate-100">
          {[
            { title: 'Нестабильная стенокардия (Арман Сагинов)', score: 84, spec: 'Кардиология', date: 'Сегодня' },
            { title: 'Мигрень без ауры (Асель Токтарова)', score: 91, spec: 'Неврология', date: 'Вчера' },
            { title: 'Внебольничная пневмония (Сергей Ахметов)', score: 76, spec: 'Пульмонология', date: '3 дня назад' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-3.5 text-xs">
              <div>
                <h4 className="font-bold text-slate-900">{item.title}</h4>
                <p className="text-slate-500 font-medium mt-0.5">{item.spec} · {item.date}</p>
              </div>

              <span className="rounded-xl bg-teal-50 px-3 py-1 font-extrabold text-teal-800 border border-teal-200 text-xs">
                {item.score}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  warning,
  iconBg,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  trend: string;
  warning?: boolean;
  iconBg: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className={`grid size-10 place-items-center rounded-2xl ${iconBg}`}>
          <Icon size={20} />
        </div>
        <span className={`text-[11px] font-extrabold rounded-md px-2 py-0.5 ${warning ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          {trend}
        </span>
      </div>

      <div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
