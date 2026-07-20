'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Send, History, HelpCircle, FileText } from 'lucide-react';

interface ClinicalQueryFormProps {
  onSubmitQuery: (symptoms: string) => void;
  isLoading: boolean;
  onCancelLoading?: () => void;
}

const TEMPLATES = [
  'Мужчина 46 лет, давящая боль за грудиной 40 минут, отдаёт в левую руку, АД 150/92, ЧСС 104.',
  'Женщина 23 года, нарастающая одышка после контакта с кошкой, свистящее дыхание, SpO2 89%.',
  'Женщина 58 лет, сильная головная боль, мушки перед глазами, АД 210/118, ЧСС 96.',
  'Мужчина 27 лет, боль около пупка сместилась в правую подвздошную область, тошнота, темп 38.1°C.',
];

export function ClinicalQueryForm({
  onSubmitQuery,
  isLoading,
  onCancelLoading,
}: ClinicalQueryFormProps) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kms-ai-queries');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = query.trim();
    if (!text || isLoading) return;

    // Save to local history
    const nextHistory = [text, ...history.filter((h) => h !== text)].slice(0, 5);
    setHistory(nextHistory);
    try {
      localStorage.setItem('kms-ai-queries', JSON.stringify(nextHistory));
    } catch {}

    onSubmitQuery(text);
  };

  const handleSelectTemplate = (tmpl: string) => {
    setQuery(tmpl);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Введите описательный анамнез и симптомы
          </h3>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
          Поддержка свободного клинического текста
        </span>
      </div>

      {/* Query Textarea */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            placeholder="Например: Пациент 65 лет обратился с жалобами на внезапную слабость в правой руке и невнятную речь. Симптомы начались 30 минут назад..."
            className="input text-xs border-slate-200 focus:border-teal-600 min-h-[140px] leading-relaxed p-4 bg-slate-50/50"
          />
        </div>

        {/* Data Hint Banner */}
        <div className="flex items-center gap-2 rounded-xl border border-teal-200/80 bg-teal-50/60 px-3.5 py-2 text-[11px] font-semibold text-teal-900">
          <HelpCircle size={14} className="text-teal-600 shrink-0" />
          <span>
            Совет: для лучшего дифференциала укажите возраст, пол, локализацию боли, факторы риска и показатели витальных функций (АД, ЧСС, SpO₂).
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FileText size={14} />
            <span>Символов: {query.length}</span>
          </div>

          <div className="flex items-center gap-2">
            {isLoading && onCancelLoading && (
              <button
                type="button"
                onClick={onCancelLoading}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                Отменить анализ
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-40 transition-all hover:scale-[1.01]"
            >
              <Send size={15} />
              <span>{isLoading ? 'Анализ клинического случая...' : 'Сформировать дифференциал'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Templates & Recent Queries */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Готовые шаблоны клинических запросов:
        </p>

        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tmpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectTemplate(tmpl)}
              className="focus-ring rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-colors line-clamp-1 max-w-xs text-left"
            >
              {tmpl}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <History size={13} />
              <span>Последние запросы:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(h)}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors line-clamp-1 max-w-xs text-left"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
