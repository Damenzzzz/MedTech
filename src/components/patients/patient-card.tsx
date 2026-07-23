'use client';

import { Heart, CheckCircle2, ArrowRight, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { StudentCaseDTO } from '@/domain/schemas';
import type { ProgressEntry } from '@/lib/progress';
import { Link } from '@/i18n/navigation';
import { FallbackImage } from '@/components/ui/fallback-image';

interface PatientCardProps {
  item: StudentCaseDTO;
  locale: string;
  isFavorite: boolean;
  progressEntry?: ProgressEntry;
  onToggleFavorite: (id: string) => void;
  index: number;
}

const URGENCY_STYLE: Record<StudentCaseDTO['urgency'], string> = {
  emergency: 'bg-red-500 text-white',
  urgent: 'bg-[#E5A04A] text-[#4A2F0E]',
  routine: 'bg-[#12B5A6] text-white',
};

const DIFFICULTY_DOTS: Record<StudentCaseDTO['difficulty'], number> = { easy: 1, medium: 2, hard: 3 };

export function PatientCard({ item, locale, isFavorite, progressEntry, onToggleFavorite, index }: PatientCardProps) {
  const isCompleted = Boolean(progressEntry);
  const t = useTranslations('Catalog');
  const c = useTranslations('Common');
  const loc = locale as 'ru' | 'kk' | 'en';

  const name = item.patient.name[loc] || item.patient.name.ru;
  const complaint = item.complaint[loc] || item.complaint.ru;
  const sexLabel = item.patient.sex === 'male' ? t('male') : t('female');
  const dots = DIFFICULTY_DOTS[item.difficulty];

  const body = (
    <>
      <div className="relative h-[132px] w-full shrink-0" style={{ background: 'linear-gradient(135deg,#E3ECF5,#EDF3F8)' }}>
        <FallbackImage key={item.id} src={item.patient.avatar} alt={name} fill sizes="238px" className="object-cover" />

        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(item.id);
          }}
          aria-label={isFavorite ? t('unfavorite') : t('favorite')}
          className={`focus-ring absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition-transform hover:scale-110 ${
            isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
          }`}
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {isCompleted && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[rgba(18,181,166,0.95)] px-2.5 py-1 text-[10px] font-semibold text-white">
            <CheckCircle2 size={12} />
            {progressEntry ? Math.round(progressEntry.score) : 0}%
          </span>
        )}

        <span className={`absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${URGENCY_STYLE[item.urgency]}`}>
          {t(item.urgency)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">{name}</div>
          <div className="mt-0.5 text-xs font-medium text-[var(--text-tertiary)]">
            {item.patient.age} {t('yearsOld')} · {sexLabel} · {item.specialty}
          </div>
        </div>
        <p className="line-clamp-2 flex-1 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{complaint}</p>
        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-2.5">
          <span className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
            {'●'.repeat(dots)}
            {'○'.repeat(3 - dots)} {t(item.difficulty)}
          </span>
          <span className="mono text-[11px] text-[var(--text-tertiary)] tabular-nums">~{item.durationMinutes} {c('minutes')}</span>
        </div>
      </div>
    </>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_10px_26px_-16px_rgba(16,32,43,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_-18px_rgba(31,111,235,0.3)]"
    >
      {isCompleted ? (
        <>
          {body}
          <div className="grid grid-cols-2 gap-2 p-4 pt-0">
            <Link
              href={`/debrief/${item.id}`}
              className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#6CD6C9] bg-[#EAF9F7] text-xs font-semibold text-[#0B645C] transition-all hover:bg-[#D2F1EC]"
            >
              <BarChart3 size={14} />
              {t('viewResult')}
            </Link>
            <Link
              href={`/training/${item.id}`}
              className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1F6FEB] text-xs font-semibold text-white transition-all hover:bg-[#1A5FD0]"
            >
              {t('retry')}
              <ArrowRight size={14} />
            </Link>
          </div>
        </>
      ) : (
        <Link href={`/training/${item.id}`} className="flex flex-1 flex-col">
          {body}
        </Link>
      )}
    </motion.article>
  );
}
