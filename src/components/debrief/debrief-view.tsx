'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, RotateCcw, Target, Award, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { DebriefResultSchema, type DebriefReference, type DebriefResult } from '@/domain/schemas';
import { Link } from '@/i18n/navigation';

export function DebriefView({ caseId }: { caseId: string }) {
  const t = useTranslations('Debrief');

  const [data, setData] = useState<DebriefResult | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`kms-debrief-${caseId}`);
      if (!raw) return null;
      return DebriefResultSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!data || !data.referencePlaceholders.some((x) => x.status === 'rag-pending')) return;
    let cancelled = false;

    fetch(`/api/session/references?caseId=${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.references?.length) return;
        const next = DebriefResultSchema.parse({
          ...data,
          referencePlaceholders: payload.references,
        });
        localStorage.setItem(`kms-debrief-${caseId}`, JSON.stringify(next));
        setData(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [caseId, data]);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-xs space-y-4">
          <Activity size={32} className="text-teal-600 mx-auto animate-pulse" />
          <h3 className="text-xl font-bold text-slate-900">
            Загрузка результатов разбора сессии...
          </h3>
          <Link
            href={`/training/${caseId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
          >
            <RotateCcw size={14} />
            <span>{t('repeat')}</span>
          </Link>
        </div>
      </div>
    );
  }

  const labels: Record<string, string> = {
    history: t('history'),
    examination: t('examination'),
    investigations: t('investigations'),
    differential: t('differential'),
    diagnosis: t('diagnosis'),
    management: t('management'),
    communication: t('communication'),
    critical: t('critical'),
  };

  const isHighScore =
    data.total >= 80 &&
    (data.missedRedFlags ?? []).length === 0 &&
    (data.criticalErrors ?? []).length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Celebration Banner for High Score */}
      {isHighScore && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-950 shadow-xs"
        >
          <Award size={22} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-emerald-900">
              🎉 Отличная клиническая работа! Вы набрали {data.total} из 100 баллов.
            </p>
            <p className="text-emerald-800 font-medium mt-0.5">
              Все критические риски и красные флаги были успешно идентифицированы.
            </p>
          </div>
        </motion.div>
      )}

      {/* Top Header Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200">
            <Sparkles size={14} className="text-teal-600" />
            <span>{t('eyebrow')}</span>
          </span>

          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {t('title')}
          </h1>

          <p className="text-xs font-semibold text-slate-600">
            {t('correct')}: <strong className="text-slate-900">{data.correctDiagnosis}</strong>
          </p>
        </div>

        {/* Animated Score Ring Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
          <div className="relative size-16 grid place-items-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isHighScore ? 'text-emerald-600' : data.total >= 60 ? 'text-teal-600' : 'text-amber-500'}
                strokeDasharray={`${data.total}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-base font-black text-slate-900">{data.total}</span>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-900">Итоговый балл</div>
            <div className="text-[11px] font-semibold text-slate-500">из 100 возможных</div>
          </div>
        </div>
      </div>

      {/* Competencies Breakdown */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          {t('rubric')}
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(data.categories).map(([key, value], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="space-y-1.5"
            >
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>{labels[key] ?? key}</span>
                <span className={value < 50 ? 'text-red-600' : value < 75 ? 'text-amber-600' : 'text-teal-700'}>
                  {Math.round(value)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                  className={`h-full rounded-full ${
                    value < 50 ? 'bg-red-500' : value < 75 ? 'bg-amber-400' : 'bg-teal-600'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Detailed Feedback Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FeedbackCard icon={AlertTriangle} title={t('missed')} items={data.missedQuestions} warning />
        <FeedbackCard icon={CheckCircle2} title="Раскрытые красные флаги" items={data.foundRedFlags} success />
        <FeedbackCard icon={Target} title="Пропущенные красные флаги" items={data.missedRedFlags} warning />
        <FeedbackCard icon={BookOpen} title={t('investigationFeedback')} items={data.investigationFeedback} />
        <FeedbackCard icon={ShieldAlert} title={t('criticalErrors')} items={data.criticalErrors} warning />
        <FeedbackCard icon={CheckCircle2} title={t('strengths')} items={data.strengths} success />
        <FeedbackCard icon={ArrowRight} title={t('recommendations')} items={data.recommendations} />
      </div>

      {/* Timeline Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          {t('timeline')}
        </h2>

        <ol className="space-y-2.5">
          {data.timeline.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 text-xs font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="font-mono text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</span>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 font-bold text-teal-800 border border-teal-200">{a.type}</span>
              <span className="text-slate-800">{a.value}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* RAG Protocol References */}
      <RagReferences title={t('references')} refs={data.referencePlaceholders} />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={`/training/${caseId}`}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <RotateCcw size={16} />
          <span>{t('repeat')}</span>
        </Link>

        <Link
          href="/patients"
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
        >
          <span>{t('nextCase')}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function RagReferences({ title, refs }: { title: string; refs: DebriefReference[] }) {
  const label = (status: DebriefReference['status']) =>
    status === 'rag-ready' ? 'RAG подключён' : status === 'rag-unavailable' ? 'RAG недоступен' : 'Загрузка RAG';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
        <BookOpen size={18} className="text-teal-600" />
        <h2>{title}</h2>
      </div>

      <div className="space-y-3">
        {refs.map((x, i) => (
          <div key={i} className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between items-start gap-4">
              <span className="font-bold text-xs text-slate-900">{x.title}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${x.status === 'rag-ready' ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
                {label(x.status)}
              </span>
            </div>
            {x.excerpt && <p className="text-xs leading-relaxed text-slate-700 font-medium">{x.excerpt}</p>}
            {x.protocolId && <p className="text-[10px] font-mono text-slate-400">{x.protocolId}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function FeedbackCard({
  icon: Icon,
  title,
  items,
  warning,
  success,
}: {
  icon: typeof Target;
  title: string;
  items: string[];
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Icon size={18} className={warning ? 'text-amber-600' : success ? 'text-emerald-600' : 'text-teal-600'} />
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1.5 text-xs font-medium text-slate-700">
          {items.map((x, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-slate-400 font-bold">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-bold text-emerald-600">✓ Замечаний не выявлено</p>
      )}
    </section>
  );
}
