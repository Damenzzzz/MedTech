'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, ShieldAlert, CheckCircle2, BookOpen, Copy, Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DiagnosisItem {
  rank: number;
  diagnosis: string;
  icd10_code: string;
  confidence: 'high' | 'medium' | 'low';
  why_this_diagnosis: string;
  supporting_findings?: { finding: string; patient_evidence?: string }[];
  missing_findings?: string[];
  recommended_checks?: string[];
}

export interface ProtocolSource {
  title: string;
  protocolId?: string;
  excerpt?: string;
  url?: string;
}

interface DifferentialResultsProps {
  diagnoses: DiagnosisItem[];
  sources?: ProtocolSource[];
  isRagReady?: boolean;
}

export function DifferentialResults({
  diagnoses,
  sources,
  isRagReady = true,
}: DifferentialResultsProps) {
  const t = useTranslations('Ai');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedSourceIdx, setExpandedSourceIdx] = useState<number | null>(null);

  if (!diagnoses || diagnoses.length === 0) return null;

  const handleCopyCitation = (src: ProtocolSource, idx: number) => {
    const citation = `Протокол: ${src.title} (${src.protocolId || 'КазМедСим'})\n${src.excerpt || ''}`;
    navigator.clipboard.writeText(citation);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Educational & Clinical Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-xs font-semibold text-teal-950 leading-relaxed shadow-xs">
        <ShieldAlert size={20} className="text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Важное клиническое предупреждение</p>
          <p className="mt-0.5 text-teal-900 font-medium">
            Ответ формируется алгоритмами AI на основе клинических рекомендаций. Результат является ориентировочным дифференциально-диагностическим рядом и НЕ является окончательным диагнозом.
          </p>
        </div>
      </div>

      {/* Ranked Diagnoses Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity size={18} className="text-teal-600" />
          <span>Дифференциально-диагностический ряд ({diagnoses.length})</span>
        </h3>

        <div className="grid gap-4">
          {diagnoses.map((item) => {
            const confBg =
              item.confidence === 'high'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : item.confidence === 'medium'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300';

            const confLabel =
              item.confidence === 'high'
                ? 'Высокая вероятность'
                : item.confidence === 'medium'
                ? 'Умеренная вероятность'
                : 'Низкая вероятность';

            return (
              <motion.article
                key={item.icd10_code + item.rank}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-teal-200 transition-colors"
              >
                {/* Header line */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-teal-600 text-white font-extrabold text-xs">
                      #{item.rank}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {item.diagnosis}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500">
                        МКБ-10: <strong className="text-slate-800">{item.icd10_code}</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${confBg}`}>
                    {confLabel}
                  </span>
                </div>

                {/* Clinical Rationale */}
                <p className="text-xs font-medium text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <strong className="text-slate-900 font-bold block mb-1">Обоснование нозологии:</strong>
                  {item.why_this_diagnosis}
                </p>

                {/* Supporting Findings */}
                {item.supporting_findings && item.supporting_findings.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Подтверждающие данные из анамнеза:</span>
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {item.supporting_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                          <span className="font-bold text-emerald-900">• {f.finding}</span>
                          {f.patient_evidence && (
                            <span className="text-slate-500 text-[11px]">
                              (Свидетельство: "{f.patient_evidence}")
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Checks & Missing Info */}
                {((item.recommended_checks && item.recommended_checks.length > 0) ||
                  (item.missing_findings && item.missing_findings.length > 0)) && (
                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    {item.recommended_checks && item.recommended_checks.length > 0 && (
                      <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3">
                        <p className="text-[11px] font-bold text-cyan-900 uppercase tracking-wider mb-1">
                          Рекомендуемые обследования:
                        </p>
                        <ul className="text-xs text-cyan-950 space-y-1">
                          {item.recommended_checks.map((rc, i) => (
                            <li key={i}>• {rc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.missing_findings && item.missing_findings.length > 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
                        <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                          Недостающая информация:
                        </p>
                        <ul className="text-xs text-amber-950 space-y-1">
                          {item.missing_findings.map((mf, i) => (
                            <li key={i}>• {mf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Protocol Sources (RAG Citations) */}
      {sources && sources.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <BookOpen size={18} className="text-teal-600" />
              <span>Источники клинических протоколов МЗ РК (RAG Sources)</span>
            </div>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 border border-teal-200">
              Официальные протоколы
            </span>
          </div>

          <div className="space-y-3">
            {sources.map((src, idx) => {
              const isExpanded = expandedSourceIdx === idx;

              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{src.title}</h5>
                      {src.protocolId && (
                        <p className="text-[11px] font-semibold text-teal-700 mt-0.5">
                          ID Протокола: {src.protocolId}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyCitation(src, idx)}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      {copiedIdx === idx ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedIdx === idx ? 'Скопировано' : 'Цитата'}</span>
                    </button>
                  </div>

                  {src.excerpt && (
                    <div className="text-xs text-slate-700 leading-relaxed pt-1">
                      <p className={isExpanded ? '' : 'line-clamp-2'}>{src.excerpt}</p>
                      <button
                        onClick={() => setExpandedSourceIdx(isExpanded ? null : idx)}
                        className="mt-1 text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-0.5"
                      >
                        <span>{isExpanded ? 'Свернуть' : 'Раскрыть фрагмент'}</span>
                        <ChevronDown size={13} className={isExpanded ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
