'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Target, Flag, ArrowRight, Activity, Sparkles, Award, BookOpen } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';
import { Link } from '@/i18n/navigation';
import type { ProgressEntry } from '@/lib/progress';
import { useProgress } from '@/lib/use-progress';
import { useUserStore } from '@/stores/user-store';

/* ── Analytics helpers ── */

function computeAnalytics(entries: ProgressEntry[]) {
  const completedCount = entries.length;
  if (completedCount === 0) {
    return {
      completedCount: 0,
      averageScore: 0,
      trend: [] as number[],
      strongSpecialty: null as string | null,
      weakSpecialty: null as string | null,
      missedFlagsCount: null as number | null,
      recentAttempts: [] as ProgressEntry[],
      streak: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => a.completedAt - b.completedAt);
  const averageScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / completedCount);
  const trend = sorted.slice(-6).map((e) => e.score);

  // Sum real missed red flags from saved progress entries
  const missedFlagsCount = entries.reduce((sum, e) => sum + (e.missedRedFlags?.length || 0), 0);

  // Specialty analytics
  const bySpecialty: Record<string, { total: number; count: number }> = {};
  for (const e of entries) {
    if (!bySpecialty[e.specialty]) bySpecialty[e.specialty] = { total: 0, count: 0 };
    bySpecialty[e.specialty].total += e.score;
    bySpecialty[e.specialty].count += 1;
  }
  const specAvg = Object.entries(bySpecialty).map(([name, d]) => ({
    name,
    avg: d.total / d.count,
  }));
  specAvg.sort((a, b) => b.avg - a.avg);
  const strongSpecialty = specAvg.length > 0 ? specAvg[0].name : null;
  const weakSpecialty = specAvg.length > 1 ? specAvg[specAvg.length - 1].name : null;

  // Streak: consecutive sessions with score >= 60
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].score >= 60) streak++;
    else break;
  }

  const recentAttempts = sorted.slice(-5).reverse();

  return {
    completedCount,
    averageScore,
    trend,
    strongSpecialty,
    weakSpecialty,
    missedFlagsCount,
    recentAttempts,
    streak,
  };
}

/* ── Component ── */

interface DashboardViewProps {
  cases?: StudentCaseDTO[];
  recommended?: StudentCaseDTO;
}

export function DashboardView({ cases = [], recommended: initialRecommended }: DashboardViewProps) {
  const t = useTranslations('Dashboard');
  const navT = useTranslations('Nav');
  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);

  const userName = hydrated && profile?.name ? profile.name : '';

  // Empty on the server, filled from localStorage once hydrated.
  const entries = useProgress();

  const analytics = useMemo(() => computeAnalytics(entries), [entries]);

  // Dynamic recommendation based on uncompleted cases & weakest specialty
  const recommendedCase = useMemo(() => {
    if (initialRecommended && cases.length === 0) return initialRecommended;
    const completedIds = new Set(entries.map((e) => e.caseId));

    // 1. Weak specialty uncompleted case
    if (analytics.weakSpecialty) {
      const weakUncompleted = cases.find(
        (c) => c.specialty === analytics.weakSpecialty && !completedIds.has(c.id),
      );
      if (weakUncompleted) return weakUncompleted;
    }

    // 2. Uncompleted core case
    const uncompletedCore = cases.find((c) => c.validationTier === 'core' && !completedIds.has(c.id));
    if (uncompletedCore) return uncompletedCore;

    // 3. Any uncompleted case
    const uncompleted = cases.find((c) => !completedIds.has(c.id));
    if (uncompleted) return uncompleted;

    return cases[0] || initialRecommended;
  }, [cases, initialRecommended, entries, analytics.weakSpecialty]);

  const recName = recommendedCase
    ? typeof recommendedCase.title === 'object'
      ? recommendedCase.title.ru
      : recommendedCase.title
    : 'Клинический случай';

  // Empty state
  if (analytics.completedCount === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          {userName && (
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              <Sparkles size={14} className="text-teal-600" />
              <span>{navT('greeting', { name: userName })}</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-xs text-center space-y-6">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-100 text-teal-700">
            <BookOpen size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              {t('emptyTitle')}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {t('emptyDescription')}
            </p>
          </div>

          {recommendedCase && (
            <Link
              href={`/training/${recommendedCase.id}`}
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-2xl bg-teal-600 px-8 font-bold text-sm text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.01]"
            >
              <span>{t('startFirst')}</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <p className="text-xs text-slate-500">
            {t('recommended')}: <strong className="text-slate-700">{recName}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        {userName && (
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <Sparkles size={14} className="text-teal-600" />
            <span>{navT('greeting', { name: userName })}</span>
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {t('title')}
        </h1>

        <p className="text-xs font-medium text-slate-600 max-w-2xl leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CheckCircle2Icon}
          title={t('completedCases')}
          value={analytics.completedCount.toString()}
          subtitle="пройденных разборов"
          color="teal"
        />
        <MetricCard
          icon={Trophy}
          title={t('averageScore')}
          value={`${analytics.averageScore}%`}
          subtitle="средняя точность"
          color="emerald"
        />
        <MetricCard
          icon={Flag}
          title="Пропущенные красные флаги"
          value={analytics.missedFlagsCount !== null ? analytics.missedFlagsCount.toString() : 'Не записано'}
          subtitle={analytics.missedFlagsCount !== null ? 'всего за все сессии' : 'отсутствуют данные'}
          color="amber"
        />
        <MetricCard
          icon={Award}
          title="Серия успешных разборов"
          value={analytics.streak.toString()}
          subtitle="подряд балл ≥ 60%"
          color="cyan"
        />
      </div>

      {/* Recommended Next Case Card */}
      {recommendedCase && (
        <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
              <Target size={18} className="text-teal-600" />
              <span>Рекомендуемый следующий случай</span>
            </div>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-extrabold text-teal-900 border border-teal-300">
              {recommendedCase.validationTier === 'core' ? 'Core (Verified)' : 'Beta (Unreviewed)'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{recName}</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Специальность: <strong className="text-slate-800">{recommendedCase.specialty}</strong> · Сложность: <strong className="text-slate-800">{recommendedCase.difficulty}</strong>
              </p>
            </div>

            <Link
              href={`/training/${recommendedCase.id}`}
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 font-bold text-xs text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all shrink-0"
            >
              <span>Начать разбор</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function CheckCircle2Icon(props: { size?: number; className?: string }) {
  return <Activity {...props} />;
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  value: string;
  subtitle: string;
  color: 'teal' | 'emerald' | 'amber' | 'cyan';
}) {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">{title}</span>
        <div className={`grid size-9 place-items-center rounded-xl border ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
      </div>

      <div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
