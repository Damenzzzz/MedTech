'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HelpCircle, Send, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FollowUpQuestion {
  question: string;
  target_diagnoses?: string[];
  rationale?: string;
}

interface ClarificationPanelProps {
  questions: FollowUpQuestion[];
  onAnswerQuestion: (answer: string) => void;
  isUpdating: boolean;
}

export function ClarificationPanel({
  questions,
  onAnswerQuestion,
  isUpdating,
}: ClarificationPanelProps) {
  const t = useTranslations('Ai');
  const [customAnswer, setCustomAnswer] = useState('');

  if (!questions || questions.length === 0) return null;

  const currentQ = questions[0];

  const handleSend = (text: string) => {
    if (!text.trim() || isUpdating) return;
    onAnswerQuestion(text.trim());
    setCustomAnswer('');
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <HelpCircle size={18} className="text-amber-600" />
          <span>Клинические уточняющие вопросы</span>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-900">
          Интерактивное уточнение
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-amber-950 leading-relaxed">
          {currentQ.question}
        </p>

        {currentQ.rationale && (
          <p className="text-[11px] font-medium text-amber-800 italic">
            Цель уточнения: {currentQ.rationale}
          </p>
        )}
      </div>

      {/* Quick Answer Buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {['Да, выражено', 'Нет, отсутствует', 'Затрудняюсь ответить'].map((opt) => (
          <button
            key={opt}
            onClick={() => handleSend(opt)}
            disabled={isUpdating}
            className="focus-ring rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50 transition-all"
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Free-text Answer Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customAnswer}
          onChange={(e) => setCustomAnswer(e.target.value)}
          placeholder="Или введите свободное дополнение к анамнезу..."
          disabled={isUpdating}
          className="input text-xs border-amber-300 focus:border-amber-600 h-10 bg-white flex-1"
        />
        <button
          onClick={() => handleSend(customAnswer)}
          disabled={!customAnswer.trim() || isUpdating}
          className="focus-ring flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-40"
        >
          <Send size={14} />
          <span>Отправить</span>
        </button>
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 animate-pulse pt-1">
          <Sparkles size={14} />
          <span>Перерасчёт вероятностей дифференциального ряда...</span>
        </div>
      )}
    </div>
  );
}
