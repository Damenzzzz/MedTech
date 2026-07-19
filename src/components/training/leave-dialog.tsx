'use client';

import { useTranslations } from 'next-intl';
import { ShieldAlert, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '@/i18n/navigation';

interface LeaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaveDialog({ isOpen, onClose }: LeaveDialogProps) {
  const t = useTranslations('Training');
  const c = useTranslations('Common');
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-50">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t('leaveTitle')}
              </h3>
            </div>

            <p className="text-xs leading-relaxed font-medium text-slate-600">
              {t('leaveText')}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {c('cancel')}
              </button>
              <button
                onClick={() => router.push('/patients')}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span>{c('confirm')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
