'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Copy,
  Gauge,
  HeartPulse,
  Loader2,
  MessageCircleQuestion,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { RagBadge } from '@/components/ai/rag-badge';

type AssistantResult = {
  disclaimer: string;
  urgency: 'emergency' | 'urgent' | 'routine';
  possible_directions: string[];
  prepare: string[];
  measurements_to_note: string[];
  questions_for_doctor: string[];
  what_to_tell_doctor: string[];
  red_flags_when_urgent: string[];
  rag_status?: string;
  sources_count?: number;
};

export function PatientAssistant() {
  const t = useTranslations('PatientAssistant');
  const locale = useLocale();

  const [symptoms, setSymptoms] = useState('');
  const [data, setData] = useState<AssistantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    const value = symptoms.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    const started = performance.now();

    try {
      const response = await fetch('/api/patient/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptoms: value, locale }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error === 'unauthorized' ? t('errorAuth') : t('errorGeneric'));
      }
      setData((await response.json()) as AssistantResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setElapsedMs(performance.now() - started);
      setLoading(false);
    }
  }

  const copyQuestions = async () => {
    if (!data?.questions_for_doctor.length) return;
    try {
      await navigator.clipboard.writeText(data.questions_for_doctor.map((q, i) => `${i + 1}. ${q}`).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('errorCopy'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#AFCBFB] bg-[#EAF2FE] px-3 py-1 text-xs font-semibold text-[#124F8C]">
          <Sparkles size={14} className="text-[#1F6FEB]" />
          {t('eyebrow')}
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{t('lead')}</p>
      </header>

      {/* Input */}
      <section className="card rounded-3xl p-6 space-y-4">
        <label htmlFor="assistant-symptoms" className="block text-sm font-bold text-slate-800">
          {t('inputLabel')}
        </label>
        <textarea
          id="assistant-symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={t('inputPlaceholder')}
          className="input min-h-40 text-sm leading-6"
          maxLength={4000}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={loading || !symptoms.trim()}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[#1F6FEB] px-6 text-xs font-bold text-white shadow-md shadow-[#1F6FEB]/20 transition-all hover:bg-[#1A5FD0] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? t('submitLoading') : t('submit')}
          </button>
          <p className="text-[11px] font-medium text-slate-500">{t('durationHint')}</p>
        </div>

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-2xl border border-[#D6E5FD] bg-[#EAF2FE]/60 p-4"
          >
            <Loader2 size={18} className="shrink-0 animate-spin text-[#1F6FEB]" aria-hidden />
            <div className="space-y-1.5 w-full">
              <p className="text-xs font-bold text-[#0D3A73]">{t('loadingTitle')}</p>
              <div className="h-2 w-4/5 rounded-full bg-[#AFCBFB]/60" aria-hidden />
              <div className="h-2 w-3/5 rounded-full bg-[#AFCBFB]/60" aria-hidden />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-600" aria-hidden />
              {error}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100"
            >
              <RefreshCw size={13} />
              {t('retry')}
            </button>
          </div>
        )}
      </section>

      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Emergency banner */}
          {data.urgency === 'emergency' && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-3xl border-2 border-red-400 bg-red-50 p-5 shadow-sm"
            >
              <PhoneCall size={26} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="text-base font-extrabold text-red-900">{t('emergencyTitle')}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-red-800">{t('emergencyText')}</p>
              </div>
            </div>
          )}

          {/* Disclaimer — always on top of the result */}
          <div className="flex items-start gap-3 rounded-3xl border border-[#AFCBFB] bg-[#EAF2FE]/80 p-5">
            <ShieldAlert size={22} className="mt-0.5 shrink-0 text-[#1F6FEB]" aria-hidden />
            <div>
              <p className="text-sm font-extrabold text-[#0B1C33]">{t('disclaimerTitle')}</p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-[#0D3A73]">{data.disclaimer}</p>
            </div>
          </div>

          {/* Where the answer came from. Skipped for the red-flag shortcut: that
              response is a fixed safety script, neither RAG nor model output. */}
          {data.urgency !== 'emergency' && (
            <RagBadge
              ragStatus={data.rag_status}
              sourcesCount={data.sources_count ?? 0}
              elapsedMs={elapsedMs}
              tone="light"
            />
          )}

          <Section icon={HeartPulse} title={t('directionsTitle')} note={t('directionsNote')} items={data.possible_directions} />
          <Section icon={ClipboardList} title={t('prepareTitle')} items={data.prepare} />
          <Section icon={Gauge} title={t('measureTitle')} items={data.measurements_to_note} />

          {/* Questions for the doctor — the payoff of the whole screen */}
          <section className="card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <MessageCircleQuestion size={18} className="text-[#1F6FEB]" aria-hidden />
                {t('questionsTitle')}
              </h2>
              {data.questions_for_doctor.length > 0 && (
                <button
                  type="button"
                  onClick={copyQuestions}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[#7CA9F2] bg-[#EAF2FE] px-3 py-1.5 text-[11px] font-bold text-[#124F8C] hover:bg-[#D6E5FD]"
                >
                  {copied ? <Check size={13} className="text-[#0E9E92]" /> : <Copy size={13} />}
                  {copied ? t('copied') : t('copyQuestions')}
                </button>
              )}
            </div>
            {data.questions_for_doctor.length > 0 ? (
              <ol className="space-y-2">
                {data.questions_for_doctor.map((question, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm font-medium leading-relaxed text-slate-800"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#1F6FEB] text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{question}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">{t('emptySection')}</p>
            )}
          </section>

          <Section icon={Send} title={t('tellTitle')} items={data.what_to_tell_doctor} />
          <Section icon={AlertTriangle} title={t('urgentTitle')} items={data.red_flags_when_urgent} tone="amber" />
        </motion.div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  note,
  items,
  tone = 'teal',
}: {
  icon: typeof HeartPulse;
  title: string;
  note?: string;
  items: string[];
  tone?: 'teal' | 'amber';
}) {
  const t = useTranslations('PatientAssistant');
  const accent = tone === 'amber' ? 'text-[#C77A1E]' : 'text-[#1F6FEB]';

  return (
    <section className="card rounded-3xl p-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <Icon size={18} className={accent} aria-hidden />
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {note && (
          <span className="rounded-lg bg-[#FAE3C4]/80 px-2 py-0.5 text-[11px] font-bold text-[#6B4414]">{note}</span>
        )}
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm font-medium leading-relaxed text-slate-700">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`font-bold ${accent}`} aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t('emptySection')}</p>
      )}
    </section>
  );
}
