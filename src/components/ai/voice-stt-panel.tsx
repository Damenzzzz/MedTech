'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Copy, Check, Send, AlertTriangle, UserCheck, Stethoscope, User, HeartPulse } from 'lucide-react';
import { motion } from 'motion/react';

export interface Turn {
  speaker: 'doctor' | 'patient' | 'relative' | 'nurse' | 'unknown';
  text: string;
  start?: number;
  end?: number;
}

interface VoiceSTTPanelProps {
  onSendTranscriptToAI: (transcriptText: string) => void;
}

export function VoiceSTTPanel({ onSendTranscriptToAI }: VoiceSTTPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMicError, setHasMicError] = useState(false);

  const [turns, setTurns] = useState<Turn[]>([
    { speaker: 'doctor', text: 'Здравствуйте! На что жалуетесь последние дни?' },
    { speaker: 'patient', text: 'Беспокоит сильная давящая боль за грудиной около сорока минут, отдаёт в левую руку.' },
    { speaker: 'doctor', text: 'Понял вас. Раньше такие боли возникали? Курите?' },
    { speaker: 'patient', text: 'Нет, впервые так сильно. Курю более двадцати лет.' },
  ]);

  const [copied, setCopied] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    setHasMicError(false);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stream acquired successfully
      setIsRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setHasMicError(true);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsProcessing(true);

    // Simulate STT processing / API call
    setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordTime(0);
  };

  const handleCopyTranscript = () => {
    const text = turns.map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToAI = () => {
    const text = turns.map((t) => t.text).join(' ');
    onSendTranscriptToAI(text);
  };

  const speakerConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Stethoscope }> = {
    doctor: { label: 'Врач', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-900', icon: Stethoscope },
    patient: { label: 'Пациент', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-900', icon: User },
    nurse: { label: 'Медсестра', bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-900', icon: HeartPulse },
    relative: { label: 'Родственник', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-900', icon: UserCheck },
    unknown: { label: 'Голос', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', icon: User },
  };

  const minutes = String(Math.floor(recordTime / 60)).padStart(2, '0');
  const seconds = String(recordTime % 60).padStart(2, '0');

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Mic size={20} className="text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Распознавание речи и расшифровка приёма (STT)
          </h3>
        </div>

        <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800 border border-teal-200">
          Диаризация реплик
        </span>
      </div>

      {/* Recording Control Banner */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center space-y-4">
        {/* Animated Wave visualizer when recording */}
        {isRecording ? (
          <div className="flex items-center gap-1.5 h-10">
            {[20, 38, 15, 42, 28, 35, 18, 40, 24].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [12, h, 12] }}
                transition={{ repeat: Infinity, duration: 0.6 + (i % 3) * 0.2 }}
                className="w-1.5 rounded-full bg-red-500"
              />
            ))}
          </div>
        ) : (
          <div className="grid size-14 place-items-center rounded-2xl bg-teal-100 text-teal-700">
            <Mic size={28} />
          </div>
        )}

        <div className="text-center">
          <div className="font-mono text-xl font-black text-slate-900">
            {minutes}:{seconds}
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {isProcessing ? 'Распознавание речи и расшифровка аудио...' : isRecording ? 'Идёт запись разговора врач-пациент...' : 'Нажмите кнопку для начала записи'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:bg-red-700 transition-all hover:scale-105"
            >
              <Mic size={16} />
              <span>Начать запись</span>
            </button>
          ) : (
            <>
              <button
                onClick={stopRecording}
                className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all"
              >
                <Square size={15} />
                <span>Остановить</span>
              </button>
              <button
                onClick={cancelRecording}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Отмена
              </button>
            </>
          )}
        </div>

        {hasMicError && (
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
            <AlertTriangle size={15} />
            <span>Доступ к микрофону заблокирован браузером. Разрешите доступ в настройках.</span>
          </div>
        )}
      </div>

      {/* Transcript Turns List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Расшифрованные реплики (Диаризация):
          </h4>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {turns.map((tItem, idx) => {
            const cfg = speakerConfig[tItem.speaker] || speakerConfig.unknown;
            const Icon = cfg.icon;

            return (
              <div key={idx} className={`rounded-2xl border p-3.5 space-y-1 ${cfg.bg}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className="text-teal-700" />
                    <span>{cfg.label}</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={tItem.text}
                  onChange={(e) => {
                    const next = [...turns];
                    next[idx].text = e.target.value;
                    setTurns(next);
                  }}
                  className="w-full bg-transparent text-xs font-medium text-slate-900 border-b border-slate-300/60 focus:border-teal-600 focus:outline-none py-1"
                />
              </div>
            );
          })}
        </div>

        {/* Send to Clinical Assistant Button */}
        <button
          onClick={handleSendToAI}
          className="focus-ring w-full rounded-2xl bg-teal-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
        >
          <Send size={16} />
          <span>Отправить транскрипт в AI-ассистент (после подтверждения)</span>
        </button>
      </div>
    </div>
  );
}
