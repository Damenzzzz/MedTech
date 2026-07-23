'use client';

import { AnimatePresence, motion } from 'motion/react';
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof HeartPulse }> = {
  neutral: { label: 'Состояние стабильное', bg: 'bg-[rgba(18,181,166,0.92)]', text: 'text-white', icon: HeartPulse },
  listening: { label: 'Слушает врача', bg: 'bg-[rgba(31,111,235,0.92)]', text: 'text-white', icon: MessageSquare },
  thinking: { label: 'Обдумывает ответ…', bg: 'bg-[rgba(31,182,208,0.92)]', text: 'text-white', icon: Sparkles },
  speaking: { label: 'Отвечает на вопрос', bg: 'bg-[rgba(31,111,235,0.92)]', text: 'text-white', icon: MessageSquare },
  coughing: { label: 'Кашель', bg: 'bg-[rgba(224,145,42,0.92)]', text: 'text-white', icon: Thermometer },
  pain: { label: 'Испытывает боль', bg: 'bg-[rgba(240,86,63,0.92)]', text: 'text-white', icon: AlertTriangle },
  dyspnea: { label: 'Затруднённое дыхание', bg: 'bg-[rgba(240,86,63,0.92)]', text: 'text-white', icon: AlertTriangle },
  anxious: { label: 'Тревожность', bg: 'bg-[rgba(224,145,42,0.92)]', text: 'text-white', icon: AlertTriangle },
  dizzy: { label: 'Головокружение', bg: 'bg-[rgba(224,145,42,0.92)]', text: 'text-white', icon: AlertTriangle },
  relieved: { label: 'Улучшение состояния', bg: 'bg-[rgba(18,181,166,0.92)]', text: 'text-white', icon: HeartPulse },
  deteriorating: { label: 'Ухудшение состояния', bg: 'bg-[rgba(240,86,63,0.92)]', text: 'text-white', icon: AlertTriangle },
  emergency: { label: 'Неотложная ситуация!', bg: 'bg-red-600', text: 'text-white', icon: AlertTriangle },
};

/**
 * Left-column patient snapshot: portrait + live status badge, vitals grid and
 * chief complaint. Replaces the old full-width animated stage — the patient's
 * reactive state (visualState/latestAnswer) now surfaces as the status badge
 * and a compact speech callout instead of a large center avatar.
 */
export function PatientStage({ patient, visualState, latestAnswer, isThinking, locale }: PatientStageProps) {
  const loc = locale as 'ru' | 'kk' | 'en';
  const patientName = patient.patient.name[loc] || patient.patient.name.ru;
  const complaint = patient.complaint[loc] || patient.complaint.ru;
  const status = STATUS_CONFIG[visualState] || STATUS_CONFIG.neutral;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)]">
        <div className="relative h-[150px]" style={{ background: 'linear-gradient(135deg,#1F6FEB,#12B5A6)' }}>
          <FallbackImage
            key={patient.id}
            src={patient.patient.avatar}
            alt={patientName}
            fill
            priority
            sizes="300px"
            className="object-cover"
            style={{ objectPosition: 'center 20%' }}
          />
          <span
            className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}
          >
            <StatusIcon size={12} className={visualState === 'emergency' ? 'animate-bounce' : ''} />
            {status.label}
          </span>
        </div>

        <div className="p-4">
          <div className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">{patientName}</div>
          <div className="mt-0.5 text-[12.5px] font-medium text-[var(--text-tertiary)]">
            {patient.patient.age} · {patient.patient.sex === 'male' ? 'мужской' : 'женский'} · {patient.specialty}
          </div>

          <AnimatePresence mode="wait">
            {isThinking || (visualState === 'speaking' && latestAnswer) ? (
              <motion.div
                key="speech"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-2xl bg-[#F4F7FB] p-3"
              >
                <div className="text-[10.5px] font-semibold text-[#9AA7B4]">{patientName}</div>
                {isThinking ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-[var(--text-tertiary)]">
                    Обдумывает<span className="animate-pulse">…</span>
                  </div>
                ) : (
                  <p className="mt-0.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#33465A]">{latestAnswer}</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="complaint"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-2xl bg-[#F4F7FB] p-3"
              >
                <div className="text-[10.5px] font-semibold text-[#9AA7B4]">Основная жалоба</div>
                <p className="mt-0.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#33465A]">{complaint}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--glass-border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_10px_24px_-16px_rgba(16,32,43,0.16)]">
        <div className="mb-3 text-xs font-semibold text-[var(--text-secondary)]">Показатели</div>
        <div className="grid grid-cols-2 gap-2.5">
          <VitalCell label="ЧСС" value={String(patient.vitals.heartRate)} />
          <VitalCell label="АД" value={patient.vitals.bloodPressure} />
          <VitalCell label="SpO₂" value={`${patient.vitals.spo2}%`} />
          <VitalCell label="t°" value={String(patient.vitals.temperature)} />
        </div>
      </div>
    </div>
  );
}

function VitalCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F4F7FB] px-3 py-2.5">
      <div className="text-[10px] font-medium text-[#9AA7B4]">{label}</div>
      <div className="mono text-[19px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
