'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { PatientVisualState, StudentCaseDTO } from '@/domain/schemas';
import { HeartPulse, MessageSquare, AlertTriangle, Sparkles, Thermometer } from 'lucide-react';
import { FallbackImage } from '@/components/ui/fallback-image';

interface PatientStageProps {
  patient: StudentCaseDTO;
  visualState: PatientVisualState;
  latestAnswer?: string;
  isThinking?: boolean;
  locale: string;
}

export function PatientStage({
  patient,
  visualState,
  latestAnswer,
  isThinking,
  locale,
}: PatientStageProps) {
  const patientName =
    typeof patient.patient.name === 'object'
      ? patient.patient.name[locale as 'ru' | 'kk' | 'en'] || patient.patient.name.ru
      : patient.patient.name;

  const complaint =
    typeof patient.complaint === 'object'
      ? patient.complaint[locale as 'ru' | 'kk' | 'en'] || patient.complaint.ru
      : patient.complaint;

  // Medical status label & color mapping
  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof HeartPulse }> = {
    neutral: { label: 'Состояние стабильное', bg: 'bg-[#EAF9F7] border-[#A6E3DA]', text: 'text-[#0B645C]', icon: HeartPulse },
    listening: { label: 'Слушает врача', bg: 'bg-[#EAF2FE] border-[#AFCBFB]', text: 'text-[#124F8C]', icon: MessageSquare },
    thinking: { label: 'Обдумывает ответ…', bg: 'bg-[#E8F7FA] border-[#9DE0EC]', text: 'text-[#126374]', icon: Sparkles },
    speaking: { label: 'Отвечает на вопрос', bg: 'bg-[#EAF2FE] border-[#AFCBFB]', text: 'text-[#0D3A73]', icon: MessageSquare },
    coughing: { label: 'Кашель', bg: 'bg-[#FDF3E7] border-[#F3CA8D]', text: 'text-[#6B4414]', icon: Thermometer },
    pain: { label: 'Испытывает боль', bg: 'bg-[#FAE3C4] border-[#EAB165]', text: 'text-[#4A2F0E]', icon: AlertTriangle },
    dyspnea: { label: 'Затруднённое дыхание (Одышка)', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-900', icon: AlertTriangle },
    anxious: { label: 'Тревожность', bg: 'bg-[#FDF3E7] border-[#F3CA8D]', text: 'text-[#6B4414]', icon: AlertTriangle },
    dizzy: { label: 'Головокружение', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900', icon: AlertTriangle },
    relieved: { label: 'Улучшение состояния', bg: 'bg-[#EAF9F7] border-[#A6E3DA]', text: 'text-[#0B645C]', icon: HeartPulse },
    deteriorating: { label: 'Ухудшение состояния', bg: 'bg-rose-100 border-rose-300', text: 'text-rose-950', icon: AlertTriangle },
    emergency: { label: 'Неотложная ситуация!', bg: 'bg-red-100 border-red-300', text: 'text-red-950', icon: AlertTriangle },
  };

  const currentStatus = statusConfig[visualState] || statusConfig.neutral;
  const StatusIcon = currentStatus.icon;

  // Animation variant for avatar
  const getAnimation = () => {
    switch (visualState) {
      case 'coughing':
        return { x: [0, -5, 5, -3, 0], y: [0, 2, 0] };
      case 'pain':
        return { scale: [1, 0.985, 1], rotate: [0, -1, 1, 0] };
      case 'dyspnea':
        return { y: [0, -5, 0], scale: [1, 1.01, 1] };
      case 'emergency':
        return { scale: [1, 0.98, 1.02, 1], x: [-2, 2, 0] };
      default:
        return { y: [0, -2.5, 0] }; // Soft natural breathing
    }
  };

  const getTransition = () => {
    switch (visualState) {
      case 'coughing':
        return { repeat: Infinity, duration: 0.45 };
      case 'pain':
        return { repeat: Infinity, duration: 1.2 };
      case 'dyspnea':
        return { repeat: Infinity, duration: 1.5 };
      default:
        return { repeat: Infinity, duration: 3.5 };
    }
  };

  return (
    <section className="glass relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden p-6">
      {/* Consultation-room backdrop: doctor and patient in the clinic room. Sits
          behind everything, softened so the portrait and overlays stay readable. */}
      {patient.scene && (
        <>
          <FallbackImage
            key={patient.id}
            src={patient.scene}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover opacity-45 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/45 to-white/80" />
        </>
      )}

      {/* Background Clinical Grid */}
      <div className="clinical-grid absolute inset-0 opacity-50" />

      {/* Top Left: Patient Condition Badge */}
      <div className="absolute left-4 top-4 z-10">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold shadow-xs ${currentStatus.bg} ${currentStatus.text}`}>
          <StatusIcon size={14} className={visualState === 'emergency' ? 'animate-bounce' : ''} />
          <span>● {currentStatus.label}</span>
        </div>
      </div>

      {/* Top Right: Vital Signs Summary Pill */}
      <div className="mono glass absolute right-4 top-4 z-10 hidden sm:flex items-center gap-3 rounded-full px-3.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
        <span>ЧСС: <strong className="text-[var(--text-primary)] font-bold">{patient.vitals.heartRate}</strong></span>
        <span className="h-3 w-px bg-[var(--border-color)]" />
        <span>АД: <strong className="text-[var(--text-primary)] font-bold">{patient.vitals.bloodPressure}</strong></span>
        <span className="h-3 w-px bg-[var(--border-color)]" />
        <span>SpO₂: <strong className="text-[var(--text-primary)] font-bold">{patient.vitals.spo2}%</strong></span>
      </div>

      {/* Avatar Container */}
      <div className="relative z-10 w-full max-w-md my-auto flex flex-col items-center">
        {/* Speech / Thinking Bubble Overlay */}
        <AnimatePresence>
          {(isThinking || (visualState === 'speaking' && latestAnswer)) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="glass-strong mb-4 w-full max-w-sm rounded-2xl p-4 text-xs font-medium text-[var(--text-secondary)] leading-relaxed relative"
            >
              <div className="flex items-center gap-2 mb-1 text-[#1A5FD0] font-bold">
                <MessageSquare size={14} />
                <span>{patientName}:</span>
              </div>
              {isThinking ? (
                <div className="flex items-center gap-1 text-[var(--text-tertiary)] font-medium">
                  <span>Обдумывает</span>
                  <span className="animate-pulse">...</span>
                </div>
              ) : (
                <p className="line-clamp-3">{latestAnswer}</p>
              )}
              {/* Pointer Triangle */}
              <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 size-0 border-x-8 border-x-transparent border-t-8 border-t-[var(--surface-glass-strong)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Avatar Frame */}
        <motion.div
          animate={getAnimation()}
          transition={getTransition()}
          className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border-2 border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
        >
          <FallbackImage
            key={patient.id}
            src={patient.patient.avatar}
            alt={patientName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition duration-300"
          />

          {/* Bottom Gradient overlay with Name & Complaint */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-5 pt-12 text-white">
            <h3 className="text-lg font-bold leading-tight">
              {patientName}
            </h3>
            <p className="text-xs font-medium text-slate-200 line-clamp-1 mt-0.5">
              {complaint}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
