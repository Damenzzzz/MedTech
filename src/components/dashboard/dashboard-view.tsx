'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Target, Flag, ArrowRight, Activity, Sparkles, Award, TrendingUp, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import type { StudentCaseDTO } from '@/domain/schemas';
import { Link } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

/* ── Versioned progress storage ── */

const ProgressEntrySchema = z.object({
  caseId: z.string(),
  sessionId: z.string(),
  score: z.number().min(0).max(100),
  specialty: z.string(),
  categories: z.record(z.string(), z.number()).optional(),
  completedAt: z.number(),
});
type ProgressEntry = z.infer<typeof ProgressEntrySchema>;

const ProgressStoreSchema = z.object({
  version: z.literal(1),
  entries: z.array(ProgressEntrySchema),
});

function loadProgress(): ProgressEntry[] {
  try {
    const raw = localStorage.getItem('kms-progress');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Handle v1 envelope
    if (parsed && typeof parsed === 'object' && parsed.version === 1) {
      return ProgressStoreSchema.parse(parsed).entries;
    }
    // Handle legacy array format
    if (Array.isArray(parsed)) {
      const entries: ProgressEntry[] = [];
      for (const item of parsed) {
        const result = ProgressEntrySchema.safeParse(item);
        if (result.success) entries.push(result.data);
      }
      return entries;
    }
    return [];
  } catch {
    return [];
  }
}

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
      missedFlagsCount: 0,
      recentAttempts: [] as ProgressEntry[],
      streak: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => a.completedAt - b.completedAt);
  const averageScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / completedCount);
  const trend = sorted.slice(-6).map((e) => e.score);

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
    missedFlagsCount: 0,
    recentAttempts,
    streak,
  };
}

/* ── Component ── */

interface DashboardViewProps {
  recommended: StudentCaseDTO;
}

export function DashboardView({ recommended }: DashboardViewProps) {
  const t = useTranslations('Dashboard');
  const navT = useTranslations('Nav');
  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);

  const userName = hydrated && profile?.name ? profile.name : '';

  const [entries, setEntries] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    setEntries(loadProgress());
  }, []);

  const analytics = useMemo(() => computeAnalytics(entries), [entries]);

  const recName = typeof recommended.title === 'object' ? recommended.title.ru : recommended.title;

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

          <Link
            href={`/training/${recommended.id}`}
            className="focus-ring inline-flex h-12 items-center gap-2 rounded-2xl bg-teal-600 px-8 font-bold text-sm text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.01]"
          >
            <span>{t('startFirst')}</span>
            <ArrowRight size={16} />
          </Link>

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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Trophy}
          label={t('completed')}
          value={`${analytics.completedCount}`}
          trend={analytics.streak > 1 ? `${analytics.streak} ${t('streak')}` : ''}
          iconBg="bg-teal-100 text-teal-700"
        />

        <MetricCard
          icon={Target}
          label={t('average')}
          value={`${analytics.averageScore}%`}
          trend={analytics.averageScore >= 80 ? t('excellent') : analytics.averageScore >= 60 ? t('good') : t('needsWork')}
          iconBg="bg-emerald-100 text-emerald-700"
        />

        <MetricCard
          icon={Award}
          label={t('strong')}
          value={analytics.strongSpecialty ?? '—'}
          trend={analytics.weakSpecialty ? `${t('weak')}: ${analytics.weakSpecialty}` : ''}
          iconBg="bg-purple-100 text-purple-700"
        />

        <MetricCard
          icon={Flag}
          label={t('missedFlags')}
          value={`${analytics.missedFlagsCount}`}
          trend=""
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
              <p className="text-xs text-slate-500 mt-0.5">{t('trendSubtitle')}</p>
            </div>
            {analytics.trend.length >= 2 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <TrendingUp size={12} />
                {analytics.trend[analytics.trend.length - 1] - analytics.trend[0] > 0
                  ? `+${analytics.trend[analytics.trend.length - 1] - analytics.trend[0]}%`
                  : `${analytics.trend[analytics.trend.length - 1] - analytics.trend[0]}%`}
              </span>
            )}
          </div>

          <div className="flex h-48 items-end gap-4 pt-4">
            {analytics.trend.map((val, idx) => (
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
                <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
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
              {recommended.specialty} · ~{recommended.durationMinutes} {t('minutes')}
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
          {analytics.recentAttempts.map((item) => (
            <div key={item.sessionId} className="flex items-center justify-between py-3.5 text-xs">
              <div>
                <h4 className="font-bold text-slate-900">{item.caseId}</h4>
                <p className="text-slate-500 font-medium mt-0.5">
                  {item.specialty} · {new Date(item.completedAt).toLocaleDateString()}
                </p>
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
  iconBg,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  trend: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className={`grid size-10 place-items-center rounded-2xl ${iconBg}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-[11px] font-extrabold rounded-md px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
