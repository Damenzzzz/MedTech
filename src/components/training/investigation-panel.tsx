'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FlaskConical, Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StudentCaseDTO, StudentInvestigationDTO, OrderedInvestigation } from '@/domain/schemas';

interface InvestigationPanelProps {
  patient: StudentCaseDTO;
  orderedInvestigations: OrderedInvestigation[];
  onOrderTest: (id: string, result: string, delayMs: number) => Promise<void>;
  onUpdateStatus: (id: string, status: 'pending' | 'ready' | 'failed') => void;
  onNextStage: () => void;
  locale: string;
}

export function InvestigationPanel({
  patient,
  orderedInvestigations,
  onOrderTest,
  onUpdateStatus,
  onNextStage,
  locale,
}: InvestigationPanelProps) {
  const c = useTranslations('Common');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'laboratory' | 'functional' | 'imaging'>('all');
  const [confirmTest, setConfirmTest] = useState<StudentInvestigationDTO | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup timers for pending investigations with proper cleanup
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    for (const inv of orderedInvestigations) {
      if (inv.status === 'pending') {
        const remaining = inv.readyAt - Date.now();

        if (remaining <= 0) {
          onUpdateStatus(inv.id, 'ready');
        } else {
          const tId = setTimeout(() => {
            onUpdateStatus(inv.id, 'ready');
          }, remaining);
          timers.push(tId);
        }
      }
    }

    return () => {
      timers.forEach((tId) => clearTimeout(tId));
    };
  }, [orderedInvestigations, onUpdateStatus]);

  const filteredTests = patient.investigations.filter((invItem) => {
    const name =
      typeof invItem.name === 'object'
        ? invItem.name[locale as 'ru' | 'kk' | 'en'] || invItem.name.ru
        : invItem.name;

    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesCategory = category === 'all' || invItem.category === category;

    return matchesSearch && matchesCategory;
  });

  const handleAttemptOrder = (invItem: StudentInvestigationDTO) => {
    const existing = orderedInvestigations.find((inv) => inv.id === invItem.id);
    if (existing) return;

    if (invItem.cost >= 5 || invItem.category === 'imaging') {
      setConfirmTest(invItem);
    } else {
      executeOrder(invItem);
    }
  };

  const executeOrder = async (invItem: StudentInvestigationDTO) => {
    setConfirmTest(null);
    setOrderingId(invItem.id);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/session/investigations/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: patient.id,
          investigationId: invItem.id,
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error('order_failed');
      }

      const data = await res.json();
      await onOrderTest(invItem.id, data.result, invItem.delayMs);
    } catch {
      setErrorMessage(`Не удалось выписать направление на "${typeof invItem.name === 'object' ? invItem.name.ru : invItem.name}".`);
    } finally {
      setOrderingId(null);
    }
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

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="font-bold text-red-700 hover:underline"
          >
            Закрыть
          </button>
        </div>
      )}

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
          const orderedEntry = orderedInvestigations.find((inv) => inv.id === invItem.id);
          const isOrdered = Boolean(orderedEntry);
          const isPending = orderedEntry?.status === 'pending';
          const isReady = orderedEntry?.status === 'ready';
          const isOrderingThis = orderingId === invItem.id;

          const name =
            typeof invItem.name === 'object'
              ? invItem.name[locale as 'ru' | 'kk' | 'en'] || invItem.name.ru
              : invItem.name;

          return (
            <div
              key={invItem.id}
              className={`rounded-2xl border p-4 transition-all ${
                isReady
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : isPending
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
                    {invItem.delayMs > 0 && (
                      <span className="text-slate-400">• Время выполнения: {Math.round(invItem.delayMs / 1000)}с</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleAttemptOrder(invItem)}
                  disabled={isOrdered || isOrderingThis}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isReady
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                      : isPending
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default animate-pulse'
                      : isOrderingThis
                      ? 'bg-teal-700 text-white cursor-wait'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
                  }`}
                >
                  {isReady ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Готово</span>
                    </>
                  ) : isPending ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      <span>В обработке...</span>
                    </>
                  ) : isOrderingThis ? (
                    <span>Назначение...</span>
                  ) : (
                    <span>Назначить</span>
                  )}
                </button>
              </div>

              {/* Pending state banner */}
              {isPending && (
                <div className="mt-3 pt-2 border-t border-amber-200/60 text-xs font-medium text-amber-900 flex items-center gap-2">
                  <Clock size={14} className="animate-spin text-amber-600" />
                  <span>Лаборатория проводит анализ. Результат появится через несколько секунд...</span>
                </div>
              )}

              {/* Ready Result View */}
              {isReady && orderedEntry && (
                <div className="mt-3 pt-3 border-t border-emerald-200/80 text-xs font-medium text-slate-800 leading-relaxed">
                  <p className="font-bold text-emerald-950">Результат исследования:</p>
                  <p className="mt-0.5 text-slate-900">{orderedEntry.result}</p>
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
                Вы назначаете исследование{' '}
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
