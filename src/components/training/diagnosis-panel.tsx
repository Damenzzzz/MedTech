'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, AlertTriangle, Plus } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface DiagnosisPanelProps {
  patient: StudentCaseDTO;
  finalDiagnosis: string | undefined;
  onSetFinalDiagnosis: (code: string) => void;
  reasoning: string;
  onSetReasoning: (value: string) => void;
  selectedDifferentials: string[];
  onNextStage: () => void;
  locale: string;
}

export function DiagnosisPanel({
  patient,
  finalDiagnosis,
  onSetFinalDiagnosis,
  reasoning,
  onSetReasoning,
  selectedDifferentials,
  onNextStage,
  locale,
}: DiagnosisPanelProps) {
  const t = useTranslations('Training');
  const [customFinal, setCustomFinal] = useState('');

  const handleAddCustomFinal = () => {
    const trimmed = customFinal.trim();
    if (!trimmed) return;
    onSetFinalDiagnosis(trimmed);
    setCustomFinal('');
  };

  const isSelected = Boolean(finalDiagnosis);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
          <Activity size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('final')}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Формулировка заключительного диагноза
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Warning if no final diagnosis selected */}
        {!isSelected && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 font-medium leading-relaxed">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Основной диагноз не выбран</p>
              <p className="mt-0.5 text-amber-800">
                Выберите итоговое заключение из предложенных вариантов или введите свой диагноз по МКБ-10.
              </p>
            </div>
          </div>
        )}

        {/* Primary Diagnosis Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Выберите диагноз из дифференциального ряда:
          </label>
          <select
            value={finalDiagnosis || ''}
            onChange={(e) => onSetFinalDiagnosis(e.target.value)}
            className="input text-xs border-slate-200 focus:border-teal-600 h-11 bg-white font-semibold"
          >
            <option value="">— Не выбран —</option>
            {patient.differentials.map((diff) => {
              const name =
                typeof diff.name === 'object'
                  ? diff.name[locale as 'ru' | 'kk' | 'en'] || diff.name.ru
                  : diff.name;

              return (
                <option key={diff.code} value={diff.code}>
                  {diff.code} · {name}
                </option>
              );
            })}
            {selectedDifferentials
              .filter((code) => !patient.differentials.some((d) => d.code === code))
              .map((customCode) => (
                <option key={customCode} value={customCode}>
                  {customCode} (Свой диагноз)
                </option>
              ))}
          </select>
        </div>

        {/* Custom Diagnosis Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customFinal}
            onChange={(e) => setCustomFinal(e.target.value)}
            placeholder="Или введите альтернативный кодовый диагноз..."
            className="input text-xs border-slate-200 focus:border-teal-600 h-10 flex-1"
          />
          <button
            onClick={handleAddCustomFinal}
            disabled={!customFinal.trim()}
            className="focus-ring flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus size={15} />
            <span>Указать</span>
          </button>
        </div>

        {/* Clinical Reasoning Textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            {t('reasoning')}
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => onSetReasoning(e.target.value)}
            placeholder={t('reasoningPlaceholder')}
            className="input text-xs border-slate-200 focus:border-teal-600 min-h-[120px] leading-relaxed p-3"
          />
          <p className="text-[11px] text-slate-400">
            Укажите факты анамнеза, осмотра и результаты исследований, подтверждающие диагноз.
          </p>
        </div>
      </div>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к плану ведения →
      </button>
    </div>
  );
}
