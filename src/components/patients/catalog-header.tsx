'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Shuffle, RotateCcw, Trash2 } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';
import { Link } from '@/i18n/navigation';
import { FallbackImage } from '@/components/ui/fallback-image';

interface CatalogHeaderProps {
  cases: StudentCaseDTO[];
  locale: string;
  completedIds: Set<string>;
  totalCases: number;
  completedCount: number;
  onSelectRandom: () => void;
  onResumeLast: () => void;
  onResetProgress?: () => void;
  hasActiveSession: boolean;
}

const URGENCY_RANK: Record<StudentCaseDTO['urgency'], number> = { emergency: 0, urgent: 1, routine: 2 };

export function CatalogHeader({
  cases,
  locale,
  completedIds,
  totalCases,
  completedCount,
  onSelectRandom,
  onResumeLast,
  onResetProgress,
  hasActiveSession,
}: CatalogHeaderProps) {
  const t = useTranslations('Catalog');
  const loc = locale as 'ru' | 'kk' | 'en';

  const featured = useMemo(() => {
    const pool = cases.filter((c) => !completedIds.has(c.id));
    const source = pool.length > 0 ? pool : cases;
    return [...source].sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])[0] ?? null;
  }, [cases, completedIds]);

  const progressPct = totalCases > 0 ? Math.round((completedCount / totalCases) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4.5 min-[881px]:grid-cols-[1.55fr_1fr]">
      {/* Featured case */}
      {featured ? (
        <Link
          href={`/training/${featured.id}`}
          className="group relative flex min-h-[290px] flex-col justify-end overflow-hidden rounded-[32px] p-7 shadow-[0_26px_60px_-20px_rgba(16,44,80,0.6)]"
          style={{ background: 'linear-gradient(130deg,#12324F 0%,#1F6FEB 130%)' }}
        >
          <FallbackImage
            src={featured.patient.avatar}
            alt=""
            fill
            sizes="(max-width: 880px) 100vw, 55vw"
            className="object-cover object-center opacity-90"
            style={{
              maskImage: 'linear-gradient(to left, #000 40%, transparent)',
              WebkitMaskImage: 'linear-gradient(to left, #000 40%, transparent)',
              maskPosition: 'right',
              WebkitMaskPosition: 'right',
              maskSize: '52% 100%',
              WebkitMaskSize: '52% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <div className="relative z-[2] max-w-[60%]">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${
                featured.urgency === 'emergency'
                  ? 'bg-[rgba(240,86,63,0.9)]'
                  : featured.urgency === 'urgent'
                    ? 'bg-[rgba(224,145,42,0.9)]'
                    : 'bg-[rgba(18,181,166,0.9)]'
              }`}
            >
              {t('featuredBadge')}
            </span>
            <div className="mt-3 text-2xl font-bold tracking-tight text-white">
              {(featured.patient.name[loc] || featured.patient.name.ru)}, {featured.patient.age}
            </div>
            <div className="mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-white/85">
              {featured.specialty} · {featured.complaint[loc] || featured.complaint.ru}
            </div>
            <span className="mt-4.5 inline-flex h-11 items-center rounded-2xl bg-white px-5.5 text-sm font-semibold text-[#12324F] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.35)] transition-transform group-hover:-translate-y-0.5">
              {t('start')} →
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-[32px] border border-[var(--border-color)] bg-[var(--surface)]" />
      )}

      {/* Status widgets stacked */}
      <div className="flex flex-col gap-4.5">
        <div className="relative flex flex-1 flex-col justify-center rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_28px_-16px_rgba(16,32,43,0.18)]">
          {completedCount > 0 && onResetProgress && (
            <button
              type="button"
              onClick={onResetProgress}
              aria-label={t('resetProgress')}
              className="focus-ring absolute right-4 top-4 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}
          <div className="text-[13px] font-semibold text-[var(--text-secondary)]">{t('yourProgress')}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="mono text-[34px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
              {completedCount}
            </span>
            <span className="text-sm font-medium text-[var(--text-tertiary)]">
              {t('ofTotalCases', { total: totalCases })}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(16,32,43,0.07)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#1F6FEB,#12B5A6)' }}
            />
          </div>
          {hasActiveSession && (
            <button
              type="button"
              onClick={onResumeLast}
              className="focus-ring mt-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-[#1F6FEB] hover:underline"
            >
              <RotateCcw size={13} />
              {t('resumeLast')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSelectRandom}
          className="flex flex-1 flex-col justify-center rounded-3xl p-5 text-left text-white shadow-[0_12px_30px_-14px_rgba(18,181,166,0.6)] transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#0E9E92,#12B5A6)' }}
        >
          <div className="flex items-center gap-2 text-[13px] font-medium text-white/85">
            <Shuffle size={14} />
            {t('recommendedNext')}
          </div>
          <div className="mt-1.5 text-lg font-semibold tracking-tight">{t('random')}</div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-white/85">{t('randomPatientDesc')}</div>
        </button>
      </div>
    </div>
  );
}
