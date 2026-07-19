'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, ShieldAlert, Plus } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface ManagementPanelProps {
  patient: StudentCaseDTO;
  managementNotes: string;
  onSetManagementNotes: (notes: string) => void;
  onAppendNoteItem: (item: string) => void;
  onNextStage: () => void;
  locale: string;
}

export function ManagementPanel({
  patient,
  managementNotes,
  onSetManagementNotes,
  onAppendNoteItem,
  onNextStage,
  locale,
}: ManagementPanelProps) {
  const t = useTranslations('Training');

  const plan = patient.managementPlan;
  const items = [
    ...plan.recommendations,
    ...plan.medications,
    ...plan.nonDrug,
    plan.disposition,
    plan.followUp,
    ...plan.redFlags,
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
          <ClipboardList size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('management')}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Маршрутизация, терапия и красные флаги
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Quick Checklist Suggestions */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Нажмите, чтобы добавить в план ведения:
          </p>
          <div className="space-y-1.5">
            {items.map((itemObj, idx) => {
              const val =
                typeof itemObj === 'object'
                  ? itemObj[locale as 'ru' | 'kk' | 'en'] || itemObj.ru
                  : String(itemObj);

              return (
                <button
                  key={val + idx}
                  type="button"
                  onClick={() => onAppendNoteItem(val)}
                  className="focus-ring flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-all"
                >
                  <Plus size={14} className="text-teal-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{val}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Free Text Management Plan Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Детализированный план ведения:
          </label>
          <textarea
            value={managementNotes}
            onChange={(e) => onSetManagementNotes(e.target.value)}
            placeholder={t('managementPlaceholder')}
            className="input text-xs border-slate-200 focus:border-teal-600 min-h-[140px] leading-relaxed p-3"
          />
        </div>

        {/* Educational Medication Warning */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 font-medium leading-relaxed">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Учебный дисклеймер по препаратам</p>
            <p className="mt-0.5 text-amber-800">{t('medicationWarning')}</p>
          </div>
        </div>
      </div>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к завершению приёма →
      </button>
    </div>
  );
}
