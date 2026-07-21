'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send, Sparkles, Mic, RotateCcw, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import type { StudentCaseDTO, DialogueMessage } from '@/domain/schemas';

interface ConversationPanelProps {
  patient: StudentCaseDTO;
  dialogue: DialogueMessage[];
  revealedFactCount: number;
  onAskQuestion: (question: string) => Promise<void>;
  isThinking: boolean;
  hasError: boolean;
  onRetry: () => void;
  onNextStage: () => void;
}

export function ConversationPanel({
  patient: _patient,
  dialogue,
  revealedFactCount,
  onAskQuestion,
  isThinking,
  hasError,
  onRetry,
  onNextStage,
}: ConversationPanelProps) {
  const t = useTranslations('Training');
  const c = useTranslations('Common');
  const [inputQuestion, setInputQuestion] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages or thinking state
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [dialogue, isThinking]);

  // Retain focus in input field after asking
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputQuestion.trim();
    if (!text || isThinking) return;

    setInputQuestion('');

    try {
      await onAskQuestion(text);
    } catch {
      // Handled by parent error state
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleQuickQuestionClick = (q: string) => {
    setInputQuestion(q);
    inputRef.current?.focus();
  };

  const quickItems = (t.raw('quickItems') as string[]) || [
    'Когда это началось?',
    'Какие ещё симптомы?',
    'Есть ли факторы риска?',
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Panel Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Беседа с пациентом
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              Сбор анамнеза заболевания
            </p>
          </div>
        </div>

        {/* Revealed facts badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
          <Sparkles size={13} className="text-teal-600" />
          <span>Раскрыто фактов: {revealedFactCount}</span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-[260px] max-h-[360px] overflow-y-auto space-y-3 pr-2 scrollbar-thin"
      >
        {dialogue.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-center text-xs font-medium text-slate-500">
            👋 {t('historyEmpty')}
          </div>
        )}

        {dialogue.map((m) => {
          const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 ${
                m.role === 'student' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'patient' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
                  П
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                  m.role === 'student'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                }`}
              >
                <p className="font-medium">{m.text}</p>
                <p
                  className={`mt-1 text-[10px] text-right ${
                    m.role === 'student' ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  {timeStr}
                </p>
              </div>

              {m.role === 'student' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-700 font-bold text-xs">
                  В
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 p-3 rounded-2xl w-fit"
          >
            <Bot size={15} className="text-teal-600 animate-spin" />
            <span>{t('thinking')}</span>
          </motion.div>
        )}

        {/* Error Retry State */}
        {hasError && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <span>Ошибка соединения с пациентом.</span>
            <button
              onClick={onRetry}
              className="flex items-center gap-1 font-bold text-red-700 hover:underline"
            >
              <RotateCcw size={13} />
              {c('retry')}
            </button>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder={t('ask')}
            disabled={isThinking}
            className="input text-xs border-slate-200 focus:border-teal-600 h-11 flex-1"
          />

          {/* Voice Input UI Hook */}
          <button
            type="button"
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            title="Голосовой ввод (UI Hook)"
            className={`focus-ring grid size-11 shrink-0 place-items-center rounded-xl border transition-all ${
              isVoiceActive
                ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Mic size={18} />
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isThinking}
            aria-label={t('send')}
            className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-40 transition-all"
          >
            <Send size={17} />
          </button>
        </div>

        {/* Quick Questions Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Быстрые:
          </span>
          {quickItems.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleQuickQuestionClick(q)}
              className="focus-ring rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Next Stage Button */}
      <button
        onClick={onNextStage}
        className="focus-ring mt-auto w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
      >
        Перейти к осмотру →
      </button>
    </div>
  );
}
