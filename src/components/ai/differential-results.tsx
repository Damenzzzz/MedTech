'use client';

import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPlus,
  Copy,
  FilePlus2,
  HelpCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ProtocolViewer } from '@/components/ai/protocol-viewer';
import type {
  DiagnosisItem,
  ProtocolSource,
  RagStatus,
} from '@/domain/schemas';

interface DifferentialResultsProps {
  diagnoses: DiagnosisItem[];
  sources?: ProtocolSource[];
  ragStatus?: RagStatus;
  generationProvider?: string;
  onRequestRetry?: () => void;
  canInsert?: boolean;
  onInsertDiagnosis?: (item: DiagnosisItem) => void;
  onInsertSource?: (source: ProtocolSource) => void;
}

export function DifferentialResults({
  diagnoses,
  sources = [],
  ragStatus = 'rag-ready',
  generationProvider = 'alem',
  canInsert = false,
  onInsertDiagnosis,
  onInsertSource,
}: DifferentialResultsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedSourceIdx, setExpandedSourceIdx] = useState<number | null>(null);
  const [expandedDiagnosisIdxs, setExpandedDiagnosisIdxs] = useState<Set<number>>(new Set());
  const [insertedDiagnosisIdxs, setInsertedDiagnosisIdxs] = useState<Set<number>>(new Set());
  const [insertedSourceIdxs, setInsertedSourceIdxs] = useState<Set<number>>(new Set());
  const [viewerSource, setViewerSource] = useState<ProtocolSource | null>(null);

  if (!diagnoses || diagnoses.length === 0) return null;

  const handleInsertDiagnosis = (item: DiagnosisItem, idx: number) => {
    onInsertDiagnosis?.(item);
    setInsertedDiagnosisIdxs((prev) => new Set(prev).add(idx));
  };

  const handleInsertSource = (source: ProtocolSource, idx: number) => {
    onInsertSource?.(source);
    setInsertedSourceIdxs((prev) => new Set(prev).add(idx));
  };

  const toggleExpandDiagnosis = (idx: number) => {
    setExpandedDiagnosisIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleCopyCitation = (src: ProtocolSource, idx: number) => {
    const citation = `Протокол: ${src.title} (${src.protocolId || 'МЗ РК'})\n${src.excerpt || ''}`;
    navigator.clipboard.writeText(citation);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const hasSources = Array.isArray(sources) && sources.length > 0;

  return (
    <div className="space-y-6">
      {/* Educational & Clinical Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#AFCBFB] bg-[#EAF2FE]/80 p-4 text-xs font-semibold text-[#0B1C33] leading-relaxed shadow-xs">
        <ShieldAlert size={20} className="text-[#1F6FEB] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Важное клиническое предупреждение</p>
          <p className="mt-0.5 text-[#0D3A73] font-medium">
            Ответ сформирован алгоритмами AI на основе клинических протоколов. AI не является настоящим врачом. Результат носит ориентировочный учебный характер и требует обязательной проверки врачом.
          </p>
        </div>
      </div>

      {/* RAG Status Banner */}
      {ragStatus === 'fallback' && (
        <div className="flex items-center justify-between rounded-2xl border border-[#F3CA8D] bg-[#FDF3E7] p-3.5 text-xs font-semibold text-[#6B4414] shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-[#C77A1E] shrink-0" />
            <span>Ответ сформирован в автономном режиме без обращения к RAG-базе (Провайдер LLM: {generationProvider}).</span>
          </div>
        </div>
      )}

      {/* Ranked Diagnoses Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity size={18} className="text-[#1F6FEB]" />
            Дифференциально-диагностический ряд ({diagnoses.length})
          </span>
          <span className="text-xs font-medium text-slate-500">
            LLM: <span className="font-bold text-[#1A5FD0]">{generationProvider}</span>
          </span>
        </h3>

        <div className="grid gap-4">
          {diagnoses.map((item, idx) => {
            const conf = item.confidence || 'medium';
            const confBg =
              conf === 'high'
                ? 'bg-[#D2F1EC] text-[#084D47] border-[#6CD6C9]'
                : conf === 'medium'
                ? 'bg-[#FAE3C4] text-[#6B4414] border-[#EAB165]'
                : 'bg-slate-100 text-slate-700 border-slate-300';

            const confLabel =
              conf === 'high'
                ? 'Высокая вероятность'
                : conf === 'medium'
                ? 'Умеренная вероятность'
                : 'Низкая вероятность';

            const rationale = item.clinical_rationale || {
              summary: item.why_this_diagnosis || `${item.diagnosis} (${item.icd10_code}) рассматривается в дифференциальном ряду.`,
              supporting_patient_facts: (item.supporting_findings || []).map((f) => ({ fact: f.finding, patient_evidence: f.patient_evidence || '' })),
              missing_or_conflicting_facts: item.missing_findings || [],
              why_this_rank: `Позиция #${item.rank} на основе клинического анализа.`,
              next_discriminator: item.recommended_checks?.[0] || 'Требуется дополнительное обследование.',
              source_ids: [],
            };

            const isExpanded = expandedDiagnosisIdxs.has(idx);
            const mainSupporting = rationale.supporting_patient_facts[0];
            const mainMissing = rationale.missing_or_conflicting_facts[0];

            return (
              <motion.article
                key={item.icd10_code + item.rank + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-[#AFCBFB] transition-colors"
              >
                {/* Header line */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-[#1F6FEB] text-white font-extrabold text-xs">
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

                  <div className="flex items-center gap-2">
                    <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${confBg}`}>
                      {confLabel}
                    </span>
                    {onInsertDiagnosis && (
                      <button
                        type="button"
                        onClick={() => handleInsertDiagnosis(item, idx)}
                        disabled={!canInsert}
                        className="focus-ring flex items-center gap-1 rounded-lg border border-[#7CA9F2] bg-[#EAF2FE] px-2.5 py-1 text-[11px] font-bold text-[#124F8C] hover:bg-[#D6E5FD] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {insertedDiagnosisIdxs.has(idx) ? <Check size={13} /> : <ClipboardPlus size={13} />}
                        <span>{insertedDiagnosisIdxs.has(idx) ? 'В протоколе' : 'В протокол'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Rationale Card: «Почему выбран этот вариант» */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Sparkles size={14} className="text-[#1F6FEB]" />
                      Почему выбран этот вариант
                    </span>
                    <span className="text-[11px] font-semibold text-[#855518] bg-[#FAE3C4]/80 px-2 py-0.5 rounded-md">
                      AI-обоснование — требует проверки врачом
                    </span>
                  </div>

                  {/* Summary (Collapsed View) */}
                  <p className="text-xs font-medium text-slate-800 leading-relaxed">
                    {rationale.summary}
                  </p>

                  {/* Main supporting & missing factors (Collapsed View) */}
                  <div className="grid gap-2 text-xs sm:grid-cols-2 pt-1 border-t border-slate-200/60">
                    {mainSupporting && (
                      <div className="flex items-start gap-1.5 text-[#084D47] bg-[#EAF9F7]/70 p-2 rounded-xl border border-[#D2F1EC]/80">
                        <CheckCircle2 size={13} className="text-[#0E9E92] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Главный факт: </span>
                          <span>{mainSupporting.fact}</span>
                          {mainSupporting.patient_evidence && (
                            <span className="block text-[11px] text-[#0E7D72] italic">
                              «{mainSupporting.patient_evidence}»
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {mainMissing && (
                      <div className="flex items-start gap-1.5 text-[#6B4414] bg-[#FDF3E7]/70 p-2 rounded-xl border border-[#FAE3C4]/80">
                        <HelpCircle size={13} className="text-[#C77A1E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Главный неизвестный фактор: </span>
                          <span>{mainMissing}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand Button: «Подробнее» */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleExpandDiagnosis(idx)}
                      className="focus-ring flex items-center gap-1 text-xs font-bold text-[#1A5FD0] hover:text-[#0D3A73] hover:underline"
                    >
                      <span>{isExpanded ? 'Свернуть' : 'Подробнее'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded View («Подробнее») */}
                  {isExpanded && (
                    <div className="space-y-4 pt-3 border-t border-slate-200 text-xs text-slate-800 animate-in fade-in duration-200">
                      {/* All Supporting Patient Facts */}
                      {rationale.supporting_patient_facts.length > 0 && (
                        <div>
                          <span className="font-bold text-[#084D47] block mb-1.5 flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-[#0E9E92]" /> Подтверждающие факты из текста пациента:
                          </span>
                          <ul className="space-y-1.5">
                            {rationale.supporting_patient_facts.map((factItem, fIdx) => (
                              <li key={fIdx} className="bg-[#EAF9F7] p-2.5 rounded-xl border border-[#D2F1EC]">
                                <div className="font-bold text-[#052B27]">• {factItem.fact}</div>
                                {factItem.patient_evidence && (
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    Свидетельство в тексте: <span className="italic font-medium text-slate-800">«{factItem.patient_evidence}»</span>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing or Conflicting Facts */}
                      {rationale.missing_or_conflicting_facts.length > 0 && (
                        <div>
                          <span className="font-bold text-[#6B4414] block mb-1.5 flex items-center gap-1">
                            <HelpCircle size={13} className="text-[#C77A1E]" /> Недостающие критерии и вопросы:
                          </span>
                          <ul className="space-y-1 bg-[#FDF3E7] p-2.5 rounded-xl border border-[#FAE3C4] text-[#4A2F0E]">
                            {rationale.missing_or_conflicting_facts.map((mf, mfIdx) => (
                              <li key={mfIdx}>• {mf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Why this rank */}
                      {rationale.why_this_rank && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-900 block mb-0.5">Почему эта позиция в рейтинге:</span>
                          <p className="text-slate-700 leading-relaxed">{rationale.why_this_rank}</p>
                        </div>
                      )}

                      {/* Next Discriminator */}
                      {rationale.next_discriminator && (
                        <div className="bg-[#E8F7FA] p-3 rounded-xl border border-[#CDEFF5] text-[#082F38]">
                          <span className="font-bold block mb-0.5">Ключевое дифференциальное обследование:</span>
                          <p>{rationale.next_discriminator}</p>
                        </div>
                      )}

                      {/* Source Chips */}
                      {rationale.source_ids.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="font-bold text-slate-700">RAG Источники:</span>
                          {rationale.source_ids.map((srcId) => (
                            <span key={srcId} className="rounded-lg bg-[#D6E5FD] px-2 py-0.5 text-[10px] font-bold text-[#0D3A73] border border-[#7CA9F2]">
                              {srcId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Protocol Sources (RAG Citations or Empty State) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <BookOpen size={18} className="text-[#1F6FEB]" />
            <span>Источники клинических протоколов МЗ РК</span>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${
              hasSources
                ? 'bg-[#EAF2FE] text-[#124F8C] border-[#AFCBFB]'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {hasSources ? 'Официальные протоколы' : 'Автономный режим'}
          </span>
        </div>

        {hasSources ? (
          <div className="space-y-3">
            {sources.map((src, idx) => {
              const isExpanded = expandedSourceIdx === idx;

              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{src.title}</h5>
                      {src.protocolId && (
                        <p className="text-[11px] font-semibold text-[#1A5FD0] mt-0.5">
                          ID Протокола: {src.protocolId}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {src.protocolId && (
                        <button
                          type="button"
                          onClick={() => setViewerSource(src)}
                          className="focus-ring flex items-center gap-1 rounded-lg border border-[#7CA9F2] bg-[#EAF2FE] px-2.5 py-1 text-[11px] font-bold text-[#124F8C] hover:bg-[#D6E5FD]"
                        >
                          <BookOpen size={13} />
                          <span>Протокол</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(src, idx)}
                        className="focus-ring flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                      >
                        {copiedIdx === idx ? <Check size={13} className="text-[#0E9E92]" /> : <Copy size={13} />}
                        <span>{copiedIdx === idx ? 'Скопировано' : 'Цитата'}</span>
                      </button>
                      {onInsertSource && (
                        <button
                          type="button"
                          onClick={() => handleInsertSource(src, idx)}
                          disabled={!canInsert}
                          className="focus-ring flex items-center gap-1 rounded-lg border border-[#7CA9F2] bg-[#EAF2FE] px-2.5 py-1 text-[11px] font-bold text-[#124F8C] hover:bg-[#D6E5FD] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {insertedSourceIdxs.has(idx) ? <Check size={13} /> : <FilePlus2 size={13} />}
                          <span>{insertedSourceIdxs.has(idx) ? 'В протоколе' : 'В протокол'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {src.excerpt && (
                    <div className="text-xs text-slate-700 leading-relaxed pt-1">
                      <p className={isExpanded ? '' : 'line-clamp-2'}>{src.excerpt}</p>
                      <button
                        type="button"
                        onClick={() => setExpandedSourceIdx(isExpanded ? null : idx)}
                        className="mt-1 text-[11px] font-bold text-[#1A5FD0] hover:underline flex items-center gap-0.5"
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
        ) : (
          <p className="text-xs font-medium text-slate-500 py-2">
            Ответ сформирован без подтверждённых RAG-источников.
          </p>
        )}
      </div>
      <ProtocolViewer source={viewerSource} onClose={() => setViewerSource(null)} />
    </div>
  );
}
