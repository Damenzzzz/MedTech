'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Command, X, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: number;
  onSelectStage: (stageIndex: number) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  currentStage,
  onSelectStage,
}: CommandPaletteProps) {
  const t = useTranslations('Training');
  const stageLabels = (t.raw('stages') as string[]) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Command size={18} className="text-teal-600" />
                <span>Быстрый переход по этапам (Cmd+K)</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {stageLabels.map((label, i) => (
                <button
                  key={label}
                  onClick={() => {
                    onSelectStage(i);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                    currentStage === i
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid size-5 place-items-center rounded-md text-[10px] ${
                        currentStage === i ? 'bg-white text-teal-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span>{label}</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
