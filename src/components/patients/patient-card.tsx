'use client';

import { Clock, Heart, ArrowRight, CheckCircle2, BarChart3 } from 'lucide-react';
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

export function PatientCard({
  item,
  locale,
  isFavorite,
  progressEntry,
  onToggleFavorite,
  index,
}: PatientCardProps) {
  const isCompleted = Boolean(progressEntry);
  const t = useTranslations('Catalog');
  const c = useTranslations('Common');

  const name =
    typeof item.patient.name === 'object'
      ? item.patient.name[locale as 'ru' | 'kk' | 'en'] || item.patient.name.ru
      : item.patient.name;

  const complaint =
    typeof item.complaint === 'object'
      ? item.complaint[locale as 'ru' | 'kk' | 'en'] || item.complaint.ru
      : item.complaint;

  const urgencyBg =
    item.urgency === 'emergency'
      ? 'bg-red-500 text-white'
      : item.urgency === 'urgent'
      ? 'bg-[#E5A04A] text-[#4A2F0E]'
      : 'bg-[#12B5A6] text-white';

  const difficultyBg =
    item.difficulty === 'hard'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : item.difficulty === 'medium'
      ? 'bg-[#CDEFF5] text-[#126374] border-[#9DE0EC]'
      : 'bg-[#D2F1EC] text-[#0B645C] border-[#A6E3DA]';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className={`glass group flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:border-[#7CA9F2]/60 ${
        isCompleted ? 'border-[#A6E3DA] bg-[#EAF9F7]/20 opacity-80 hover:opacity-100' : ''
      }`}
    >
      {/* Top Image & Header */}
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-[var(--surface)] border-b border-[var(--border-color)]">
          <FallbackImage
            key={item.id}
            src={item.patient.avatar}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/70 to-transparent" />

          {/* Completed Badge */}
          {isCompleted && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0E9E92] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              <CheckCircle2 size={13} />
              {t('completed')}
              {progressEntry && <span>· {Math.round(progressEntry.score)}%</span>}
            </span>
          )}

          {/* Favorite Toggle Button */}
          <button
            onClick={() => onToggleFavorite(item.id)}
            aria-label={isFavorite ? t('unfavorite') : t('favorite')}
            className={`focus-ring absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:scale-110 ${
              isFavorite ? 'text-red-500 bg-white' : 'hover:text-red-500'
            }`}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Specialty Pill */}
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm tracking-wider">
            {item.specialty}
          </span>

          {/* Urgency Badge */}
          <span className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${urgencyBg}`}>
            {t(item.urgency)}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug group-hover:text-[#1A5FD0] transition-colors">
                {name}
              </h3>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] mt-0.5">
                {item.patient.age} лет · {item.patient.sex === 'male' ? 'Мужской' : 'Женский'}
              </p>
            </div>

            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${difficultyBg}`}>
              {t(item.difficulty)}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/60 p-3">
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
              Жалоба
            </p>
            <p className="text-xs font-medium text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {complaint}
            </p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-5 pt-0 space-y-3">
        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-[11px] font-semibold text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <Clock size={14} className="text-[#1F6FEB]" />
            ~{item.durationMinutes} {c('minutes')}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {c('synthetic')}
          </span>
        </div>

        {isCompleted ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/debrief/${item.id}`}
              className="focus-ring flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#6CD6C9] bg-[#EAF9F7] font-bold text-xs text-[#0B645C] hover:bg-[#D2F1EC] transition-all"
            >
              <BarChart3 size={15} />
              <span>{t('viewResult')}</span>
            </Link>
            <Link
              href={`/training/${item.id}`}
              className="focus-ring flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#1F6FEB] font-bold text-xs text-white shadow-sm hover:bg-[#1A5FD0] transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>{t('retry')}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <Link
            href={`/training/${item.id}`}
            className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F6FEB] font-bold text-xs text-white shadow-sm hover:bg-[#1A5FD0] transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>{t('start')}</span>
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </motion.article>
  );
}
