'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, ShieldAlert, Plus } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';

interface ManagementPanelProps {
  patient: StudentCaseDTO;
  managementNotes: string;
  onSetManagementNotes: (notes: string) => void;
  onAppendNoteItem: (item: string, id?: string) => void;
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

  const options = patient.managementOptions || [];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#D6E5FD] text-[#1A5FD0]">
          <ClipboardList size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('management')}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            {t('managementPlaceholder')}
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Quick Checklist Suggestions */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {t('management')}
          </p>
          <div className="space-y-1.5">
            {options.map((opt) => {
              const val =
                typeof opt.label === 'object'
                  ? opt.label[locale as 'ru' | 'kk' | 'en'] || opt.label.ru
                  : String(opt.label);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAppendNoteItem(val, opt.id)}
                  className="focus-ring flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-medium text-slate-700 hover:border-[#7CA9F2] hover:bg-[#EAF2FE] hover:text-[#0D3A73] transition-all"
                >
                  <Plus size={14} className="text-[#1F6FEB] shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{val}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Free Text Management Plan Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            {t('management')}
          </label>
          <textarea
            value={managementNotes}
            onChange={(e) => onSetManagementNotes(e.target.value)}
            placeholder={t('managementPlaceholder')}
            className="input text-xs border-slate-200 focus:border-[#1F6FEB] min-h-[140px] leading-relaxed p-3"
          />
        </div>

        {/* Educational Medication Warning */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#F3CA8D] bg-[#FDF3E7]/80 p-3.5 text-xs text-[#6B4414] font-medium leading-relaxed">
          <ShieldAlert size={18} className="text-[#C77A1E] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{t('management')}</p>
            <p className="mt-0.5 text-[#855518]">{t('medicationWarning')}</p>
          </div>
        </div>
      </div>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-[#1F6FEB] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#1A5FD0] transition-all"
      >
        {t('next')}
      </button>
    </div>
  );
}
