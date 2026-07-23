'use client';

import { useState } from 'react';
import { HelpCircle, Send, Sparkles } from 'lucide-react';

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
  const [customAnswer, setCustomAnswer] = useState('');

  if (!questions || questions.length === 0) return null;

  const currentQ = questions[0];

  const handleSend = (text: string) => {
    if (!text.trim() || isUpdating) return;
    onAnswerQuestion(text.trim());
    setCustomAnswer('');
  };

  return (
    <div className="rounded-3xl border border-[#F3CA8D] bg-[#FDF3E7]/60 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#F3CA8D]/80 pb-3">
        <div className="flex items-center gap-2 text-[#6B4414] font-bold text-sm">
          <HelpCircle size={18} className="text-[#C77A1E]" />
          <span>Клинические уточняющие вопросы</span>
        </div>
        <span className="rounded-full bg-[#FAE3C4] px-3 py-1 text-[11px] font-extrabold text-[#6B4414]">
          Интерактивное уточнение
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#4A2F0E] leading-relaxed">
          {currentQ.question}
        </p>

        {currentQ.rationale && (
          <p className="text-[11px] font-medium text-[#855518] italic">
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
            className="focus-ring rounded-xl border border-[#EAB165] bg-white px-3.5 py-2 text-xs font-bold text-[#4A2F0E] hover:bg-[#FAE3C4] disabled:opacity-50 transition-all"
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
          className="input text-xs border-[#EAB165] focus:border-[#C77A1E] h-10 bg-white flex-1"
        />
        <button
          onClick={() => handleSend(customAnswer)}
          disabled={!customAnswer.trim() || isUpdating}
          className="focus-ring flex items-center gap-1.5 rounded-xl bg-[#C77A1E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#A3661D] disabled:opacity-40"
        >
          <Send size={14} />
          <span>Отправить</span>
        </button>
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-xs font-bold text-[#855518] animate-pulse pt-1">
          <Sparkles size={14} />
          <span>Перерасчёт вероятностей дифференциального ряда...</span>
        </div>
      )}
    </div>
  );
}
