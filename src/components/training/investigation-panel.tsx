'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FlaskConical, Search, Clock, DollarSign, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StudentCaseDTO, Investigation } from '@/domain/schemas';

interface InvestigationPanelProps {
  patient: StudentCaseDTO;
  orderedIds: string[];
  onOrderTest: (id: string, delayMs: number) => void;
  onNextStage: () => void;
  locale: string;
}

export function InvestigationPanel({
  patient,
  orderedIds,
  onOrderTest,
  onNextStage,
  locale,
}: InvestigationPanelProps) {
  const t = useTranslations('Training');
  const c = useTranslations('Common');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'laboratory' | 'functional' | 'imaging'>('all');
  const [readyIds, setReadyIds] = useState<string[]>(orderedIds);
  const [confirmTest, setConfirmTest] = useState<Investigation | null>(null);

  const filteredTests = patient.investigations.filter((invItem) => {
    const name =
      typeof invItem.name === 'object'
        ? invItem.name[locale as 'ru' | 'kk' | 'en'] || invItem.name.ru
        : invItem.name;

    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesCategory = category === 'all' || invItem.category === category;

    return matchesSearch && matchesCategory;
  });

  const handleAttemptOrder = (invItem: Investigation) => {
    if (orderedIds.includes(invItem.id)) return;

    // Expensive test confirmation threshold (e.g. cost >= 5 or imaging)
    if (invItem.cost >= 5 || invItem.category === 'imaging') {
      setConfirmTest(invItem);
    } else {
      executeOrder(invItem);
    }
  };

  const executeOrder = (invItem: Investigation) => {
    onOrderTest(invItem.id, invItem.delayMs);
    setConfirmTest(null);

    // Simulate result arrival delay
    setTimeout(() => {
      setReadyIds((prev) => [...prev, invItem.id]);
    }, Math.min(invItem.delayMs, 1000));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <FlaskConical size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Лабораторная & Инструментальная диагностика
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            Назначение обоснованных исследований
          </p>
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск исследования (ЭКГ, ОАК, КТ...)"
            className="input pl-9 text-xs border-slate-200 focus:border-teal-600 h-10"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'Все' },
            { id: 'laboratory', label: 'Лаборатория' },
            { id: 'functional', label: 'Функциональные' },
            { id: 'imaging', label: 'Визуализация' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as typeof category)}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                category === cat.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Investigations List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[240px]">
        {filteredTests.map((invItem) => {
          const isOrdered = orderedIds.includes(invItem.id);
          const isReady = readyIds.includes(invItem.id) || isOrdered;

          const name =
            typeof invItem.name === 'object'
              ? invItem.name[locale as 'ru' | 'kk' | 'en'] || invItem.name.ru
              : invItem.name;

          const result =
            typeof invItem.result === 'object'
              ? invItem.result[locale as 'ru' | 'kk' | 'en'] || invItem.result.ru
              : invItem.result;

          return (
            <div
              key={invItem.id}
              className={`rounded-2xl border p-4 transition-all ${
                isOrdered
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-0.5 text-amber-700">
                      Учебная стоимость: {invItem.cost} {c('points')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAttemptOrder(invItem)}
                  disabled={isOrdered}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isOrdered
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
                  }`}
                >
                  {isOrdered ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{t('ordered')}</span>
                    </>
                  ) : (
                    <span>Назначить</span>
                  )}
                </button>
              </div>

              {/* Reveal Result when Ordered */}
              {isOrdered && (
                <div className="mt-3 pt-3 border-t border-amber-200/80 text-xs font-medium text-slate-800 leading-relaxed">
                  <p className="font-bold text-amber-950">Результат исследования:</p>
                  <p className="mt-0.5 text-slate-900">{result}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Expensive Tests */}
      <AnimatePresence>
        {confirmTest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertCircle size={22} />
                <h4 className="text-base font-bold text-slate-900">
                  Подтверждение назначения
                </h4>
              </div>

              <p className="text-xs leading-relaxed font-medium text-slate-600">
                Вы назначаете дорогая/инвазивное исследование{' '}
                <strong className="text-slate-900">
                  {typeof confirmTest.name === 'object' ? confirmTest.name.ru : confirmTest.name}
                </strong>{' '}
                (Стоимость: {confirmTest.cost} баллов). Убедитесь, что оно клинически обосновано!
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmTest(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {c('cancel')}
                </button>
                <button
                  onClick={() => executeOrder(confirmTest)}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                >
                  Подтвердить назначение
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к дифференциальному диагнозу →
      </button>
    </div>
  );
}
