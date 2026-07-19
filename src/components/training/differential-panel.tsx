'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HeartPulse, Plus, Check } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface DifferentialPanelProps {
  patient: StudentCaseDTO;
  selectedDifferentials: string[];
  onToggleDifferential: (code: string) => void;
  onNextStage: () => void;
  locale: string;
}

export function DifferentialPanel({
  patient,
  selectedDifferentials,
  onToggleDifferential,
  onNextStage,
  locale,
}: DifferentialPanelProps) {
  const t = useTranslations('Training');
  const [customInput, setCustomInput] = useState('');

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || selectedDifferentials.includes(trimmed)) return;
    onToggleDifferential(trimmed);
    setCustomInput('');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-purple-100 text-purple-700">
          <HeartPulse size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('differentials')}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Формирование нозологических гипотез
          </p>
        </div>
      </div>

      {/* Differential Options Checkboxes */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-[260px]">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Выберите вероятные диагнозы:
        </p>

        {patient.differentials.map((diff) => {
          const isSelected = selectedDifferentials.includes(diff.code);

          const name =
            typeof diff.name === 'object'
              ? diff.name[locale as 'ru' | 'kk' | 'en'] || diff.name.ru
              : diff.name;

          return (
            <label
              key={diff.code}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                isSelected
                  ? 'border-purple-300 bg-purple-50/70 text-purple-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleDifferential(diff.code)}
                  className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  <strong className="font-bold">{diff.code}</strong> — {name}
                </span>
              </div>
            </label>
          );
        })}

        {/* Display custom added differentials */}
        {selectedDifferentials
          .filter((code) => !patient.differentials.some((d) => d.code === code))
          .map((customCode) => (
            <div
              key={customCode}
              className="flex items-center justify-between rounded-2xl border border-purple-300 bg-purple-50 p-3.5 text-xs font-bold text-purple-950"
            >
              <span>{customCode} (Свой вариант)</span>
              <button
                onClick={() => onToggleDifferential(customCode)}
                className="text-purple-600 hover:text-purple-900 text-xs font-semibold"
              >
                Удалить ✕
              </button>
            </div>
          ))}
      </div>

      {/* Custom Differential Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Свой вариант диагноза (МКБ-10)..."
          className="input text-xs border-slate-200 focus:border-purple-600 h-10 flex-1"
        />
        <button
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="focus-ring flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <Plus size={15} />
          <span>{t('addDifferential')}</span>
        </button>
      </div>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к основному диагнозу →
      </button>
    </div>
  );
}
