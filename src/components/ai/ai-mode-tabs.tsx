'use client';

import { useTranslations } from 'next-intl';
import { Stethoscope, Bot, Mic } from 'lucide-react';

export type AIMode = 'clinical' | 'simulator' | 'stt';

interface AIModeTabsProps {
  activeMode: AIMode;
  onChangeMode: (mode: AIMode) => void;
}

export function AIModeTabs({ activeMode, onChangeMode }: AIModeTabsProps) {
  const t = useTranslations('Ai');

  const tabs: { id: AIMode; label: string; icon: typeof Bot; badge?: string; desc: string }[] = [
    {
      id: 'clinical',
      label: 'Клинический запрос',
      icon: Bot,
      desc: 'AI-помощник дифференциальной диагностики & RAG',
    },
    {
      id: 'simulator',
      label: 'Симулятор пациента',
      icon: Stethoscope,
      badge: '13 сценариев',
      desc: 'Учебный тренажёр отработки навыков',
    },
    {
      id: 'stt',
      label: 'Запись приёма',
      icon: Mic,
      desc: 'Голосовая расшифровка и диаризация реплик',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeMode === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeMode(tab.id)}
            className={`focus-ring flex items-start gap-3 rounded-xl p-3.5 text-left transition-all ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:bg-slate-200/50 font-medium'
            }`}
          >
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${
                isActive ? 'bg-teal-600 text-white' : 'bg-slate-200/80 text-slate-700'
              }`}
            >
              <Icon size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs truncate font-bold">{tab.label}</span>
                {tab.badge && (
                  <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-extrabold text-teal-800 border border-teal-200">
                    {tab.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                {tab.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
