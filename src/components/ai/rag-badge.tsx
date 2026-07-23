'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Sparkles } from 'lucide-react';
import { formatElapsedSeconds, ragBadge, type RagBadgeValue } from '@/lib/rag-badge';

/**
 * Big "1 / 2" marker telling the clinician whether the answer really came from
 * the protocol base. Renders on both the dark RAG drawer and light patient screens.
 */
export function RagBadge({
  ragStatus,
  sourcesCount,
  elapsedMs,
  tone = 'light',
  className = '',
}: {
  ragStatus: string | null | undefined;
  sourcesCount: number;
  elapsedMs?: number | null;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const t = useTranslations('AI');

  const value: RagBadgeValue = ragBadge(ragStatus, sourcesCount);
  const seconds = formatElapsedSeconds(elapsedMs);
  const fromProtocols = value === 1;

  const caption = fromProtocols
    ? seconds
      ? t('ragBadgeProtocolWithTime', { seconds })
      : t('ragBadgeProtocol')
    : t('ragBadgeGenerated');

  const shell = fromProtocols
    ? tone === 'dark'
      ? 'border-[#3BC3B3]/40 bg-[#3BC3B3]/10 text-[#D2F1EC]'
      : 'border-[#6CD6C9] bg-[#EAF9F7] text-[#084D47]'
    : tone === 'dark'
    ? 'border-[#E5A04A]/30 bg-[#E5A04A]/10 text-[#FAE3C4]'
    : 'border-[#EAB165] bg-[#FDF3E7] text-[#6B4414]';

  const digit = fromProtocols
    ? 'bg-[#0E9E92] text-white'
    : tone === 'dark'
    ? 'bg-[#E5A04A] text-[#4A2F0E]'
    : 'bg-[#E0912A] text-white';

  const Icon = fromProtocols ? BookOpen : Sparkles;

  return (
    <div
      role="status"
      aria-label={`${t('ragBadgeAria', { value })} ${caption}`}
      title={caption}
      className={`flex items-center gap-3 rounded-2xl border p-3 ${shell} ${className}`}
    >
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-xl font-black tabular-nums ${digit}`}
      >
        {value}
      </span>
      <span className="flex items-start gap-1.5 text-xs font-semibold leading-5">
        <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{caption}</span>
      </span>
    </div>
  );
}
