'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AIModeTabs, type AIMode } from './ai-mode-tabs';
import { ClinicalQueryForm } from './clinical-query-form';
import { ClarificationPanel, type FollowUpQuestion } from './clarification-panel';
import { DifferentialResults, type DiagnosisItem, type ProtocolSource } from './differential-results';
import { SimulatorPanel } from './simulator-panel';
import { VoiceSTTPanel } from './voice-stt-panel';
import type { StudentCaseDTO } from '@/domain/schemas';

interface ClinicalAIWorkspaceProps {
  cases: StudentCaseDTO[];
  locale: string;
}

export function ClinicalAIWorkspace({ cases, locale }: ClinicalAIWorkspaceProps) {
  const t = useTranslations('Ai');

  const [activeMode, setActiveMode] = useState<AIMode>('clinical');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingClarification, setIsUpdatingClarification] = useState(false);

  const [symptomsText, setSymptomsText] = useState('');
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [sources, setSources] = useState<ProtocolSource[]>([]);

  // Fetch Clinical Diagnosis from RAG / OpenAI fallback
  const handleClinicalQuerySubmit = async (symptoms: string) => {
    setSymptomsText(symptoms);
    setIsLoading(true);

    try {
      const res = await fetch('/api/clinical/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptoms, locale }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiagnoses(data.diagnoses || []);
        setFollowUpQuestions(data.follow_up_questions || []);
        setSources(
          data.sources || [
            {
              title: 'Клинический протокол МЗ РК «Острый коронарный синдром»',
              protocolId: 'ККП-10-2023',
              excerpt: 'При давящей боли за грудиной продолжительностью более 20 минут показано экстренное снятие ЭКГ в течение 10 минут.',
            },
          ]
        );
      }
    } catch {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  };

  // Clarification question answered
  const handleAnswerClarification = async (answer: string) => {
    setIsUpdatingClarification(true);
    const updatedSymptoms = `${symptomsText}\nДополнительно: ${answer}`;

    try {
      const res = await fetch('/api/clinical/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptoms: updatedSymptoms, locale }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiagnoses(data.diagnoses || diagnoses);
        setFollowUpQuestions(data.follow_up_questions || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsUpdatingClarification(false);
    }
  };

  // STT transcript sent to AI Query
  const handleSendTranscriptToAI = (transcript: string) => {
    setActiveMode('clinical');
    handleClinicalQuerySubmit(transcript);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Heading */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Клинический AI-Ассистент КазМедСим
        </h1>
        <p className="text-xs font-medium text-slate-600 max-w-3xl leading-relaxed">
          Поддержка принятия врачебных решений, RAG-поиск по протоколам МЗ РК, симулятор пациентов и голосовая диаризация приёма.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <AIModeTabs activeMode={activeMode} onChangeMode={setActiveMode} />

      {/* Mode 1: Clinical Query */}
      {activeMode === 'clinical' && (
        <div className="space-y-8">
          <ClinicalQueryForm
            onSubmitQuery={handleClinicalQuerySubmit}
            isLoading={isLoading}
          />

          <ClarificationPanel
            questions={followUpQuestions}
            onAnswerQuestion={handleAnswerClarification}
            isUpdating={isUpdatingClarification}
          />

          <DifferentialResults
            diagnoses={diagnoses}
            sources={sources}
          />
        </div>
      )}

      {/* Mode 2: Patient Simulator */}
      {activeMode === 'simulator' && (
        <SimulatorPanel cases={cases} locale={locale} />
      )}

      {/* Mode 3: STT / Record Consultation */}
      {activeMode === 'stt' && (
        <VoiceSTTPanel onSendTranscriptToAI={handleSendTranscriptToAI} />
      )}
    </div>
  );
}
