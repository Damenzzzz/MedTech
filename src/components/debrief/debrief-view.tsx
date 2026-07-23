'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, RotateCcw, Target, Award, ShieldAlert, Sparkles, Activity, Loader2 } from 'lucide-react';
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

    const applyReferences = (references: DebriefReference[]) => {
      if (cancelled) return;
      const next = DebriefResultSchema.parse({ ...data, referencePlaceholders: references });
      try {
        localStorage.setItem(`kms-debrief-${caseId}`, JSON.stringify(next));
      } catch {
        // Non-fatal: the debrief still renders the fetched references in memory.
      }
      setData(next);
    };

    // Never leave the block spinning: a failed lookup resolves to rag-unavailable.
    const failed: DebriefReference[] = [
      { title: t('ragTimeout'), status: 'rag-unavailable' },
    ];

    fetch(`/api/session/references?caseId=${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => applyReferences(payload?.references?.length ? payload.references : failed))
      .catch(() => applyReferences(failed));

    return () => {
      cancelled = true;
    };
  }, [caseId, data, t]);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-12 space-y-4 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
          <Activity size={32} className="text-[#1F6FEB] mx-auto animate-pulse" />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Загрузка результатов разбора сессии...
          </h3>
          <Link
            href={`/training/${caseId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A5FD0] hover:underline"
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
          className="flex items-center gap-3 rounded-2xl border border-[#6CD6C9] bg-[#EAF9F7]/90 p-4 text-xs font-bold text-[#052B27] shadow-xs"
        >
          <Award size={22} className="text-[#0E9E92] shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-[#084D47]">
              🎉 Отличная клиническая работа! Вы набрали {data.total} из 100 баллов.
            </p>
            <p className="text-[#0B645C] font-medium mt-0.5">
              Все критические риски и красные флаги были успешно идентифицированы.
            </p>
          </div>
        </motion.div>
      )}

      {/* Top Header Card */}
      <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2FE] px-3 py-1 text-xs font-bold text-[#124F8C] border border-[#AFCBFB]">
            <Sparkles size={14} className="text-[#1F6FEB]" />
            <span>{t('eyebrow')}</span>
          </span>

          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
            {t('title')}
          </h1>

          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('correct')}: <strong className="text-[var(--text-primary)]">{data.correctDiagnosis}</strong>
          </p>
        </div>

        {/* Animated Score Ring Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]/70 p-4 shadow-xs">
          <div className="relative size-16 grid place-items-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[var(--border-color)]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isHighScore ? 'text-[#0E9E92]' : data.total >= 60 ? 'text-[#1F6FEB]' : 'text-[#E0912A]'}
                strokeDasharray={`${data.total}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-base font-black text-[var(--text-primary)]">{data.total}</span>
          </div>

          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">Итоговый балл</div>
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)]">из 100 возможных</div>
          </div>
        </div>
      </div>

      {/* Competencies Breakdown */}
      <section className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-6 space-y-6 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3">
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
              <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)]">
                <span>{labels[key] ?? key}</span>
                <span className={value < 50 ? 'text-red-600' : value < 75 ? 'text-[#C77A1E]' : 'text-[#1A5FD0]'}>
                  {Math.round(value)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-color)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                  className={`h-full rounded-full ${
                    value < 50 ? 'bg-red-500' : value < 75 ? 'bg-[#E5A04A]' : 'bg-[#1F6FEB]'
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
      <section className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-6 space-y-4 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3">
          {t('timeline')}
        </h2>

        <ol className="space-y-2.5">
          {data.timeline.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 text-xs font-medium bg-[var(--surface)]/70 p-3 rounded-2xl border border-[var(--border-color)]">
              <span className="font-mono text-[var(--text-tertiary)] font-bold">{String(i + 1).padStart(2, '0')}</span>
              <span className="rounded-md bg-[#EAF2FE] px-2 py-0.5 font-bold text-[#124F8C] border border-[#AFCBFB]">{a.type}</span>
              <span className="text-[var(--text-secondary)]">{a.value}</span>
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
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface)]/70 transition-all"
        >
          <RotateCcw size={16} />
          <span>{t('repeat')}</span>
        </Link>

        <Link
          href="/patients"
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[#1F6FEB] px-6 text-xs font-bold text-white shadow-md shadow-[#1F6FEB]/20 hover:bg-[#1A5FD0] transition-all"
        >
          <span>{t('nextCase')}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function RagReferences({ title, refs }: { title: string; refs: DebriefReference[] }) {
  const t = useTranslations('Debrief');

  const label = (status: DebriefReference['status']) =>
    status === 'rag-ready' ? t('ragReady') : status === 'rag-unavailable' ? t('ragUnavailable') : t('ragLoading');

  return (
    <section className="glass p-6 space-y-4">
      <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-base border-b border-[var(--border-color)] pb-3">
        <BookOpen size={18} className="text-[#1F6FEB]" />
        <h2>{title}</h2>
      </div>

      <div className="space-y-3">
        {refs.map((x, i) => {
          const pending = x.status === 'rag-pending';

          return (
            <div
              key={i}
              className={`rounded-2xl p-4 border space-y-2 ${
                pending ? 'bg-[#EAF2FE]/40 border-[#D6E5FD] animate-pulse' : 'bg-[var(--surface)]/60 border-[var(--border-color)]'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <span className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                  {pending && <Loader2 size={14} className="shrink-0 animate-spin text-[#1F6FEB]" />}
                  {x.title}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    x.status === 'rag-ready'
                      ? 'bg-[#EAF2FE] text-[#124F8C]'
                      : pending
                      ? 'bg-[#EAF2FE] text-[#1A5FD0]'
                      : 'bg-[#FDF3E7] text-[#855518]'
                  }`}
                >
                  {label(x.status)}
                </span>
              </div>

              {pending ? (
                <div className="space-y-1.5 pt-0.5" aria-hidden>
                  <div className="h-2 w-full rounded-full bg-[var(--border-color)]/70" />
                  <div className="h-2 w-4/5 rounded-full bg-[var(--border-color)]/70" />
                  <div className="h-2 w-2/3 rounded-full bg-[var(--border-color)]/70" />
                </div>
              ) : (
                <>
                  {x.excerpt && <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium">{x.excerpt}</p>}
                  {x.protocolId && <p className="text-[10px] font-mono text-[var(--text-tertiary)]">{x.protocolId}</p>}
                </>
              )}
            </div>
          );
        })}
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
    <section className="rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-5 space-y-3 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
        <Icon size={18} className={warning ? 'text-[#C77A1E]' : success ? 'text-[#0E9E92]' : 'text-[#1F6FEB]'} />
        <h3 className="text-xs font-bold text-[var(--text-primary)]">{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1.5 text-xs font-medium text-[var(--text-secondary)]">
          {items.map((x, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[var(--text-tertiary)] font-bold">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-bold text-[#0E9E92]">✓ Замечаний не выявлено</p>
      )}
    </section>
  );
}
