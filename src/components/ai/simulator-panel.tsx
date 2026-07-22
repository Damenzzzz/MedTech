'use client';

import { useState } from 'react';
import { Stethoscope, Search, Send, Bot } from 'lucide-react';
import type { StudentCaseDTO } from '@/domain/schemas';
import { FallbackImage } from '@/components/ui/fallback-image';

interface SimulatorPanelProps {
  cases: StudentCaseDTO[];
  locale: string;
}

export function SimulatorPanel({ cases, locale }: SimulatorPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || 'chest-pain');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'patient'; text: string }[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  const filteredCases = cases.filter((item) => {
    const name = typeof item.patient.name === 'object' ? item.patient.name.ru : item.patient.name;
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || item.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesDiff = difficultyFilter === 'all' || item.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMsg.trim();
    if (!text || isThinking) return;

    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setInputMsg('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/session/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase.id,
          message: text,
          locale,
          revealedFactIds: [],
          dialogue: chatMessages.map((m) => ({ role: m.role === 'user' ? 'student' : 'patient', text: m.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: 'patient', text: data.answer }]);
      } else {
        setChatMessages((prev) => [...prev, { role: 'patient', text: 'Мне трудно говорить...' }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'patient', text: 'Ошибка соединения.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const patientName = typeof selectedCase.patient.name === 'object' ? selectedCase.patient.name.ru : selectedCase.patient.name;
  const complaint = typeof selectedCase.complaint === 'object' ? selectedCase.complaint.ru : selectedCase.complaint;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left Column: Scenarios List & Filter */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Stethoscope size={18} className="text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Сценарии пациентов ({filteredCases.length})
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по пациенту/специальности..."
            className="input pl-9 text-xs border-slate-200 h-9"
          />
        </div>

        {/* Difficulty Filter Pills */}
        <div className="flex gap-1 overflow-x-auto text-[11px] font-semibold">
          {['all', 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d as typeof difficultyFilter)}
              className={`rounded-lg px-2.5 py-1 ${
                difficultyFilter === d
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d === 'all' ? 'Все' : d}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredCases.map((item) => {
            const isSelected = item.id === selectedCaseId;
            const name = typeof item.patient.name === 'object' ? item.patient.name.ru : item.patient.name;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCaseId(item.id);
                  setChatMessages([]);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                  isSelected
                    ? 'bg-teal-50 border border-teal-200 text-teal-950 font-bold shadow-xs'
                    : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-200">
                  <FallbackImage key={item.id} src={item.patient.avatar} alt={name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate">{name}</h4>
                  <p className="text-[10px] font-medium text-slate-500 truncate">{item.specialty} · {item.patient.age} лет</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Simulator Chat & Interactive Stage */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col space-y-4">
        {/* Scenario Header */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border-2 border-teal-200 bg-slate-100 shadow-sm">
            <FallbackImage key={selectedCase.id} src={selectedCase.patient.avatar} alt={patientName} fill className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{patientName}</h3>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                Учебный симулятор
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Жалоба: {complaint} ({selectedCase.patient.age} лет)
            </p>
          </div>
        </div>

        {/* Messages Log */}
        <div className="flex-1 min-h-[300px] max-h-[380px] overflow-y-auto space-y-3 pr-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          {chatMessages.length === 0 && (
            <div className="text-center text-xs font-medium text-slate-500 my-auto py-12">
              Задайте первый вопрос пациенту для сбора анамнеза...
            </div>
          )}

          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'patient' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-600 text-white text-xs font-bold">
                  П
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 text-xs leading-relaxed rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Bot size={14} className="animate-spin text-teal-600" />
              <span>Пациент думает...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={isThinking}
            placeholder="Задать вопрос пациенту..."
            className="input text-xs border-slate-200 focus:border-teal-600 h-11 flex-1"
          />
          <button
            type="submit"
            disabled={!inputMsg.trim() || isThinking}
            className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-md hover:bg-teal-700 disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
