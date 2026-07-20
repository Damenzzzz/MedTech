'use client';

import { useState } from 'react';
import { AIModeTabs, type AIMode } from './ai-mode-tabs';
import { ClinicalQueryForm } from './clinical-query-form';
import { ClarificationPanel, type FollowUpQuestion } from './clarification-panel';
import { DifferentialResults, type DiagnosisItem, type ProtocolSource, type RagStatus } from './differential-results';
import { SimulatorPanel } from './simulator-panel';
import { VoiceSTTPanel } from './voice-stt-panel';
import type { StudentCaseDTO } from '@/domain/schemas';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ClinicalAIWorkspaceProps {
  cases: StudentCaseDTO[];
  locale: string;
}

export function ClinicalAIWorkspace({ cases, locale }: ClinicalAIWorkspaceProps) {
  const [activeMode, setActiveMode] = useState<AIMode>('clinical');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingClarification, setIsUpdatingClarification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cachedCaseId, setCachedCaseId] = useState<string | undefined>(undefined);
  const [symptomsText, setSymptomsText] = useState('');
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [sources, setSources] = useState<ProtocolSource[]>([]);
  const [ragStatus, setRagStatus] = useState<RagStatus>('rag-ready');

  // Fetch Clinical Diagnosis from RAG / OpenAI fallback
  const handleClinicalQuerySubmit = async (symptoms: string) => {
    setSymptomsText(symptoms);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/clinical/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptoms, locale }),
      });

      if (!res.ok) {
        throw new Error('diagnose_failed');
      }

      const data = await res.json();
      setCachedCaseId(data.case_id);
      setDiagnoses(data.diagnoses || []);
      setFollowUpQuestions(data.follow_up_questions || []);
      setSources(data.sources || []);
      setRagStatus(data.rag_status || (data.sources?.length ? 'rag-ready' : 'rag-empty'));
    } catch {
      setErrorMessage('Не удалось загрузить клинический дифференциал. Повторите попытку.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clarification question answered
  const handleAnswerClarification = async (answer: string) => {
    setIsUpdatingClarification(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/clinical/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: cachedCaseId,
          additional_info: answer,
          symptoms: symptomsText,
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error('refine_failed');
      }

      const data = await res.json();
      if (data.case_id) setCachedCaseId(data.case_id);
      // Preserve existing diagnoses if server returned empty array on error
      if (Array.isArray(data.diagnoses) && data.diagnoses.length > 0) {
        setDiagnoses(data.diagnoses);
      }
      setFollowUpQuestions(data.follow_up_questions || []);
      if (Array.isArray(data.sources)) {
        setSources(data.sources);
      }
      if (data.rag_status) {
        setRagStatus(data.rag_status);
      }
    } catch {
      // Retain previous diagnoses on refine error!
      setErrorMessage('Ошибка при обновлении уточнений RAG. Ранее полученный дифференциал сохранён.');
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

          {errorMessage && (
            <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => handleClinicalQuerySubmit(symptomsText)}
                className="flex items-center gap-1 font-bold text-red-700 hover:underline"
              >
                <RotateCcw size={14} />
                <span>Повторить</span>
              </button>
            </div>
          )}

          <ClarificationPanel
            questions={followUpQuestions}
            onAnswerQuestion={handleAnswerClarification}
            isUpdating={isUpdatingClarification}
          />

          <DifferentialResults
            diagnoses={diagnoses}
            sources={sources}
            ragStatus={ragStatus}
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
