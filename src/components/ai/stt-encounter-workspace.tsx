'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  Download,
  FileAudio,
  FileText,
  Loader2,
  Mic,
  Play,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Square,
  Stethoscope,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { RagSidePanel } from '@/components/ai/rag-side-panel';
import { IIN_REGEX } from '@/domain/schemas';
import type {
  DiagnosisItem,
  EncounterProtocol,
  ProtocolSource,
  StructuredDialogue,
  SttResponse,
  SttSpeaker,
  SttTurn,
} from '@/domain/schemas';

export type SttWorkflowState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'transcribing'
  | 'transcribed'
  | 'generating-protocol'
  | 'protocol-ready'
  | 'error';

const ENCOUNTER_DRAFT_KEY = 'kms-encounter-draft-v1';

export function SttEncounterWorkspace() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<SttWorkflowState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Audio recording state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Transcription state
  const [sttData, setSttData] = useState<SttResponse | null>(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [turns, setTurns] = useState<SttTurn[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ru' | 'kk' | 'en' | 'auto'>('ru');

  // Protocol state
  const [protocol, setProtocol] = useState<EncounterProtocol | null>(null);
  const [, setProtocolHistory] = useState<EncounterProtocol[]>([]);
  const [cacheHit, setCacheHit] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

  // Patient consent
  const [hasConsent, setHasConsent] = useState(false);

  // Speaker-role provenance: set once Prompt B has labelled the turns, and
  // flipped to "stale" as soon as the doctor overrides a role by hand.
  const [rolesFromAi, setRolesFromAi] = useState(false);
  const [rolesEditedManually, setRolesEditedManually] = useState(false);

  // RAG side panel
  const [ragOpen, setRagOpen] = useState(false);
  const [ragSources, setRagSources] = useState<ProtocolSource[]>([]);

  // Encounter persistence
  const [saveOpen, setSaveOpen] = useState(false);
  const [patientIin, setPatientIin] = useState('');
  const [patientFullName, setPatientFullName] = useState('');
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [needsDoctorLogin, setNeedsDoctorLogin] = useState(false);
  const [savedPatientIin, setSavedPatientIin] = useState('');
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(ENCOUNTER_DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as {
          transcriptText?: string;
          turns?: SttTurn[];
          protocol?: EncounterProtocol;
          ragSources?: ProtocolSource[];
          patientIin?: string;
          patientFullName?: string;
        };
          setTranscriptText(draft.transcriptText || '');
          setTurns(Array.isArray(draft.turns) ? draft.turns : []);
          setProtocol(draft.protocol || null);
          setRagSources(Array.isArray(draft.ragSources) ? draft.ragSources : []);
          setPatientIin(draft.patientIin || '');
          setPatientFullName(draft.patientFullName || '');
          if (draft.protocol) setState('protocol-ready');
        }
      } catch (error) {
        console.warn('[encounter draft] failed to restore local draft', error);
      } finally {
        setDraftHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!draftHydrated || !protocol) return;
    localStorage.setItem(ENCOUNTER_DRAFT_KEY, JSON.stringify({
      transcriptText,
      turns,
      protocol,
      ragSources,
      patientIin,
      patientFullName,
      updatedAt: new Date().toISOString(),
    }));
  }, [draftHydrated, transcriptText, turns, protocol, ragSources, patientIin, patientFullName]);

  // Recording Timer
  function startTimer() {
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Audio Recording Handlers
  async function startRecording() {
    if (!hasConsent) {
      setErrorMessage('Перед началом записи необходимо подтвердить согласие пациента.');
      return;
    }

    setErrorMessage('');
    setState('requesting-permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopTimer();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('idle');
      };

      recorder.start(500); // 500ms chunks locally in browser
      startTimer();
      setState('recording');
    } catch (err) {
      stopTimer();
      setState('error');
      setErrorMessage(
        err instanceof Error ? `Не удалось получить доступ к микрофону: ${err.message}` : 'Ошибка доступа к микрофону.',
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      setState('stopping');
      recorderRef.current.stop();
    }
  }

  function deleteAudio() {
    stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setState('idle');
  }

  // STT Transcription Handler
  async function runTranscription() {
    if (!audioBlob) return;

    setErrorMessage('');
    setState('uploading');

    const form = new FormData();
    form.append('audio', audioBlob, 'consultation.webm');
    if (selectedLanguage !== 'auto') {
      form.append('language', selectedLanguage);
    }

    try {
      setState('transcribing');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'STT Request Failed' }));
        throw new Error(errJson.error || `Ошибка STT: ${response.status}`);
      }

      const data: SttResponse = await response.json();
      setSttData(data);
      setTranscriptText(data.text);
      setTurns(data.turns);
      setState('transcribed');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка выполнения транскрибации.');
    }
  }

  function deleteTranscript() {
    setSttData(null);
    setTranscriptText('');
    setTurns([]);
    setProtocol(null);
    setRagSources([]);
    setRolesFromAi(false);
    setRolesEditedManually(false);
    localStorage.removeItem(ENCOUNTER_DRAFT_KEY);
    setState('idle');
  }

  // Protocol Generation Handler
  async function generateProtocol(forceRegenerate = false) {
    if (!sttData && !transcriptText.trim() && !turns.length) return;

    setErrorMessage('');
    setState('generating-protocol');

    const dialoguePayload = {
      transcriptId: sttData?.transcriptId || `tr-manual-${Date.now()}`,
      transcriptText: transcriptText.trim(),
      turns,
      locale: 'ru',
      regenerate: forceRegenerate,
    };

    try {
      const dialogueResponse = await fetch('/api/encounter/structure-dialogue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dialoguePayload),
      });
      if (!dialogueResponse.ok) {
        const errJson = await dialogueResponse.json().catch(() => ({ error: 'Dialogue Structuring Failed' }));
        throw new Error(errJson.error || `Ошибка структурирования диалога: ${dialogueResponse.status}`);
      }
      const structuredDialogue: StructuredDialogue = await dialogueResponse.json();
      const structuredTurns: SttTurn[] = structuredDialogue.turns.map((turn) => ({
        speaker: turn.role,
        text: turn.text,
        start: turn.start_time,
      }));

      const response = await fetch('/api/encounter/protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...dialoguePayload, turns: structuredTurns }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Protocol Generation Failed' }));
        throw new Error(errJson.error || `Ошибка генерации протокола: ${response.status}`);
      }

      const isCache = response.headers.get('x-protocol-cache-hit') === '1';
      setCacheHit(isCache);

      const newProtocol: EncounterProtocol = await response.json();

      if (protocol) {
        setProtocolHistory((prev) => [protocol, ...prev]);
      }
      setTurns(structuredTurns);
      setProtocol(newProtocol);
      setRolesFromAi(true);
      setRolesEditedManually(false);
      setState('protocol-ready');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка генерации протокола.');
    }
  }

  /**
   * Rebuilds the protocol from the roles currently shown in the editor.
   * Deliberately skips structure-dialogue (Prompt A/B): once the doctor has
   * corrected a role by hand, that assignment is authoritative and must not be
   * overwritten by the model on the next pass.
   */
  async function rebuildProtocolFromTurns() {
    if (!turns.length) return;

    setErrorMessage('');
    setState('generating-protocol');

    try {
      const response = await fetch('/api/encounter/protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcriptId: sttData?.transcriptId || `tr-manual-${Date.now()}`,
          transcriptText: transcriptText.trim(),
          turns,
          locale: 'ru',
          regenerate: false,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Protocol Generation Failed' }));
        throw new Error(errJson.error || `Ошибка генерации протокола: ${response.status}`);
      }

      setCacheHit(response.headers.get('x-protocol-cache-hit') === '1');
      const newProtocol: EncounterProtocol = await response.json();
      if (protocol) setProtocolHistory((prev) => [protocol, ...prev]);
      setProtocol(newProtocol);
      setRolesEditedManually(false);
      setState('protocol-ready');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка генерации протокола.');
    }
  }

  /** Whole dialogue inverted — the single most common diarization mistake. */
  function swapAllRoles() {
    setTurns((prev) =>
      prev.map((turn) =>
        turn.speaker === 'doctor'
          ? { ...turn, speaker: 'patient' as const }
          : turn.speaker === 'patient'
            ? { ...turn, speaker: 'doctor' as const }
            : turn,
      ),
    );
    setRolesEditedManually(true);
  }

  // Manual Protocol Edit Handlers (Local State, NO LLM Invocation!)
  function updateProtocolField(path: string, value: unknown) {
    if (!protocol) return;

    // Shallow/deep copy protocol state
    const updated = JSON.parse(JSON.stringify(protocol)) as EncounterProtocol;
    updated.status = 'edited';

    // Simple path updater for key sections
    if (path === 'historyOfPresentIllness') {
      updated.sections.historyOfPresentIllness.text = String(value);
    } else if (path === 'assessmentSummary') {
      updated.sections.assessment.clinicalSummary = String(value);
    } else if (path === 'preliminaryDiagnosis') {
      updated.sections.assessment.preliminaryDiagnosis.diagnosis = String(value);
    } else if (path === 'icd10Code') {
      updated.sections.assessment.preliminaryDiagnosis.icd10Code = String(value);
    }

    setProtocol(updated);
  }

  function saveManualEdits() {
    if (!protocol) return;
    const now = new Date().toISOString();
    const updated: EncounterProtocol = {
      ...protocol,
      status: 'edited',
      version: protocol.version + 1,
      history: [
        ...protocol.history,
        { version: protocol.version + 1, createdAt: now, source: 'physician-edit' },
      ],
    };
    setProtocolHistory((prev) => [protocol, ...prev]);
    setProtocol(updated);
  }

  function approveProtocol() {
    if (!protocol) return;
    setProtocol({
      ...protocol,
      status: 'reviewed',
    });
  }

  async function saveEncounter() {
    if (!protocol) return;
    if (!IIN_REGEX.test(patientIin)) {
      setSaveError('ИИН должен содержать ровно 12 цифр.');
      return;
    }

    setSavingEncounter(true);
    setSaveError('');
    setNeedsDoctorLogin(false);
    const payload = {
      patientIin,
      patientFullName: patientFullName.trim() || undefined,
      rawTranscript: transcriptText,
      structuredDialogue: turns,
      protocol,
      ragSources,
      status: protocol.status === 'reviewed' ? 'final' : protocol.status,
    };
    localStorage.setItem(ENCOUNTER_DRAFT_KEY, JSON.stringify({
      transcriptText,
      turns,
      protocol,
      ragSources,
      patientIin,
      patientFullName,
      updatedAt: new Date().toISOString(),
    }));

    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      // 401 means no doctor session — surface a login CTA instead of a raw error.
      if (response.status === 401) {
        setNeedsDoctorLogin(true);
        return;
      }
      if (!response.ok) throw new Error(result.error || `Ошибка сохранения ${response.status}`);
      localStorage.removeItem(ENCOUNTER_DRAFT_KEY);
      setSavedPatientIin(result.patientIin || patientIin);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить приём. Черновик остался в браузере.');
    } finally {
      setSavingEncounter(false);
    }
  }

  // Insert RAG findings into the protocol draft
  function insertDiagnosisIntoProtocol(item: DiagnosisItem) {
    setProtocol((prev) => {
      if (!prev) return prev;
      const alreadyPresent = prev.sections.assessment.differentialDiagnoses.some(
        (d) => d.diagnosis === item.diagnosis && d.icd10Code === item.icd10_code,
      );
      if (alreadyPresent) return prev;
      const updated: EncounterProtocol = JSON.parse(JSON.stringify(prev));
      updated.status = 'edited';
      updated.sections.assessment.differentialDiagnoses = [
        ...updated.sections.assessment.differentialDiagnoses,
        {
          diagnosis: item.diagnosis,
          icd10Code: item.icd10_code,
          supportingEvidence: (item.supporting_findings ?? []).map((f) => f.finding),
          missingEvidence: item.missing_findings ?? [],
        },
      ];
      return updated;
    });
  }

  function insertSourceIntoProtocol(source: ProtocolSource) {
    setProtocol((prev) => {
      if (!prev) return prev;
      const citation = `[RAG] ${source.title}${source.protocolId ? ` (${source.protocolId})` : ''}${source.excerpt ? `: ${source.excerpt}` : ''}`;
      const updated: EncounterProtocol = JSON.parse(JSON.stringify(prev));
      updated.status = 'edited';
      updated.sections.assessment.clinicalSummary = updated.sections.assessment.clinicalSummary
        ? `${updated.sections.assessment.clinicalSummary}\n${citation}`
        : citation;
      return updated;
    });
  }

  // Speaker turns editing
  function updateTurnSpeaker(index: number, newSpeaker: SttSpeaker) {
    const next = [...turns];
    next[index] = { ...next[index], speaker: newSpeaker };
    setTurns(next);
    if (rolesFromAi) setRolesEditedManually(true);
  }

  function updateTurnText(index: number, newText: string) {
    const next = [...turns];
    next[index] = { ...next[index], text: newText };
    setTurns(next);
  }

  function addTurn() {
    setTurns([...turns, { speaker: 'doctor', text: '' }]);
  }

  function removeTurn(index: number) {
    setTurns(turns.filter((_, i) => i !== index));
  }

  function seekAudio(seconds?: number) {
    if (typeof seconds === 'number' && audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = seconds;
      audioPlayerRef.current.play();
    }
  }

  // Export & Utility Handlers
  function copyProtocolText() {
    if (!protocol) return;
    const text = formatProtocolAsPlainText(protocol);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadProtocolJson() {
    if (!protocol) return;
    const jsonStr = JSON.stringify(protocol, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocol-${protocol.protocolId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const formatTimer = useMemo(() => {
    const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const s = (recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [recordingSeconds]);

  if (printMode && protocol) {
    return (
      <div className="min-h-screen bg-white p-8 text-slate-900">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold">Протокол клинического приёма</h1>
              <p className="text-sm text-[var(--text-tertiary)]">ID: {protocol.protocolId} · Дата: {new Date(protocol.provenance.generatedAt).toLocaleString('ru')}</p>
            </div>
            <Button onClick={() => window.print()} variant="secondary"><Printer size={16} />Печать</Button>
            <Button onClick={() => setPrintMode(false)} variant="secondary">Назад к редактору</Button>
          </div>
          <div className="rounded-lg bg-[#FDF3E7] p-3 text-xs text-[#855518] border border-[#F3CA8D]">{protocol.warning}</div>
          <PrintProtocolView protocol={protocol} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* 1. Privacy & Patient Consent Banner */}
      <div className="rounded-2xl border border-[#E5A04A]/20 bg-[#E5A04A]/8 p-4 text-sm leading-6 text-[#6B4414] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-[#A3661D]" size={20} />
          <div>
            <span className="font-semibold text-[#855518]">Требуется согласие пациента:</span> Запись разговора и формирование черновика протокола выполняется только с согласия пациента. Данное демо не сохраняет персональные идентифицируемые медицинские данные в публичное хранилище. Ответственность за проверку и утверждение протокола лежит на лечащем враче.
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#E5A04A]/30 bg-[#E5A04A]/10 px-3 py-2 text-xs font-semibold text-[#855518] hover:bg-[#E5A04A]/20">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            className="rounded text-[#5B9EEA] focus:ring-0"
          />
          <span>Согласие получено</span>
        </label>
      </div>

      {/* 2. Audio Recording Control Panel */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileAudio className="text-[#1F6FEB]" size={22} />
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Запись и STT (OpenAI Speech-to-Text)</h2>
              <p className="text-xs text-[var(--text-tertiary)]">OpenAI используется исключительно для распознавания речи (POST /v1/audio/transcriptions).</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input h-10 w-32 border-[var(--border-color)] bg-[#F4F7FB] text-xs text-[var(--text-primary)]"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as 'ru' | 'kk' | 'en' | 'auto')}
            >
              <option value="ru">Русский (ru)</option>
              <option value="kk">Казахский (kk)</option>
              <option value="en">English (en)</option>
              <option value="auto">Автовыбор</option>
            </select>

            {state === 'recording' ? (
              <Button onClick={stopRecording} variant="danger" className="h-10 animate-pulse gap-2">
                <Square size={16} /> Остановить ({formatTimer})
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={!hasConsent || state === 'uploading' || state === 'transcribing'}
                className="h-10 gap-2 bg-[#2E86E0] font-semibold text-white hover:bg-[#5B9EEA]"
              >
                <Mic size={16} /> Записать приём
              </Button>
            )}
          </div>
        </div>

        {/* Audio Player and Send Controls */}
        {audioUrl && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-4">
            <div className="flex items-center gap-3">
              <audio ref={audioPlayerRef} src={audioUrl} controls className="h-8 max-w-xs" />
              <span className="text-xs text-[var(--text-tertiary)]">Запись ({formatTimer})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={deleteAudio} variant="secondary" size="sm" className="h-9 gap-1 text-red-600 hover:text-red-700">
                <Trash2 size={15} /> Удалить запись
              </Button>
              <Button
                onClick={runTranscription}
                disabled={state === 'transcribing' || state === 'uploading'}
                size="sm"
                className="h-9 gap-1 bg-[#2E86E0] text-white hover:bg-[#5B9EEA] font-medium"
              >
                {state === 'transcribing' || state === 'uploading' ? (
                  <>
                    <Loader2 className="animate-spin" size={15} /> Распознавание...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Распознать STT
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <span>{errorMessage}</span>
            {audioBlob && (
              <Button onClick={runTranscription} size="sm" variant="secondary" className="h-7 text-xs border-red-300 text-red-800">
                <RotateCcw size={12} className="mr-1" /> Повторить STT
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Two-Pane Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT PANE: Transcript & Speaker Turns Editor */}
        <section className="flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="text-[#1F6FEB]" size={18} /> Расшифровка разговора
              </h3>
              {sttData && (
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Провайдер: <span className="text-[#1F6FEB]">{sttData.provider}</span> ({sttData.model}) · Длительность: {sttData.durationSeconds.toFixed(1)}s
                </p>
              )}
            </div>
            {transcriptText && (
              <Button onClick={deleteTranscript} variant="ghost" size="sm" className="h-8 text-xs text-[var(--text-tertiary)] hover:text-red-600">
                <Trash2 size={14} /> Очистить
              </Button>
            )}
          </div>

          {sttData?.provider === 'mock' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E5A04A]/40 bg-[rgba(224,145,42,0.08)] p-3 text-sm font-semibold text-[#855518]">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>Это демо-текст (mock STT), не настоящая транскрибация записи.</span>
            </div>
          )}

          {/* Full Transcript Text Area */}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">Полный текст транскрипта (можно редактировать)</label>
            <textarea
              className="input min-h-32 border-[var(--border-color)] bg-[#F4F7FB] text-sm leading-6 text-[var(--text-primary)]"
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Здесь появится расшифровка разговора врачом и пациентом..."
            />
          </div>

          {/* Speaker Turns List */}
          <div className="mt-5 flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Разделение по спикерам (Diarization)</label>
              <div className="flex items-center gap-1">
                {turns.length > 0 && (
                  <Button onClick={swapAllRoles} variant="ghost" size="sm" className="h-7 text-xs text-[#1F6FEB]">
                    <RefreshCw size={13} className="mr-1" /> Поменять роли местами
                  </Button>
                )}
                <Button onClick={addTurn} variant="ghost" size="sm" className="h-7 text-xs text-[#1F6FEB]">
                  <Plus size={14} className="mr-1" /> Добавить реплику
                </Button>
              </div>
            </div>

            {/* Role provenance: AI-assigned, and whether manual edits made the protocol stale */}
            {rolesFromAi && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-[rgba(31,111,235,0.25)] bg-[rgba(31,111,235,0.06)] p-2.5 text-[11px] leading-5 text-[#0D3A73]">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-[#1F6FEB]" />
                  <span>
                    <span className="font-semibold text-[#124F8C]">Роли расставлены ИИ</span> по смыслу диалога, а не по номеру спикера. Проверьте и при необходимости исправьте вручную.
                  </span>
                </div>

                {rolesEditedManually && (
                  <div className="flex flex-col gap-2 rounded-xl border border-[#E5A04A]/30 bg-[rgba(224,145,42,0.08)] p-2.5 text-[11px] leading-5 text-[#6B4414] sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2">
                      <ShieldAlert size={14} className="mt-0.5 shrink-0 text-[#A3661D]" />
                      Роли изменены вручную — текущий протокол собран по прежним ролям.
                    </span>
                    <Button
                      onClick={rebuildProtocolFromTurns}
                      size="sm"
                      disabled={state === 'generating-protocol'}
                      className="h-7 shrink-0 gap-1 bg-[#E0912A] text-[11px] font-semibold text-white hover:bg-[#E5A04A]"
                    >
                      {state === 'generating-protocol' ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                      Пересобрать протокол
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {turns.length ? (
                turns.map((turn, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        className="input h-7 border-[var(--border-color)] bg-[#EAF2FE] text-xs font-bold text-[#124F8C]"
                        value={turn.speaker}
                        onChange={(e) => updateTurnSpeaker(idx, e.target.value as SttSpeaker)}
                      >
                        <option value="doctor">Врач</option>
                        <option value="patient">Пациент</option>
                        <option value="relative">Родственник</option>
                        <option value="nurse">Медсестра</option>
                        <option value="unknown">Неизвестно</option>
                      </select>

                      {typeof turn.start === 'number' && (
                        <button
                          type="button"
                          onClick={() => seekAudio(turn.start)}
                          className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[#1F6FEB]"
                        >
                          <Play size={10} /> {turn.start.toFixed(1)}s - {turn.end?.toFixed(1)}s
                        </button>
                      )}

                      <button type="button" onClick={() => removeTurn(idx)} className="text-[var(--text-tertiary)] hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <textarea
                      className="input min-h-16 w-full border-[var(--border-color)] bg-[#F4F7FB] text-xs leading-5 text-[var(--text-primary)]"
                      value={turn.text}
                      onChange={(e) => updateTurnText(idx, e.target.value)}
                    />
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-color)] rounded-xl">
                  Реплики спикеров появятся после транскрибации или ввода текста.
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Generate Protocol */}
          <div className="mt-5 border-t border-[var(--border-color)] pt-4 flex items-center justify-between">
            <Button
              onClick={() => generateProtocol(false)}
              disabled={state === 'generating-protocol' || (!transcriptText.trim() && !turns.length)}
              aria-busy={state === 'generating-protocol'}
              className="w-full h-11 bg-[#2E86E0] text-white font-semibold hover:bg-[#5B9EEA] gap-2"
            >
              {state === 'generating-protocol' ? (
                <>
                  <Loader2 className="animate-spin" size={17} /> Формируется протокол...
                </>
              ) : (
                <>
                  <Sparkles size={17} /> Сформировать черновик протокола
                </>
              )}
            </Button>
          </div>
        </section>

        {/* RIGHT PANE: Structured Protocol Editor */}
        <section className="flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-16px_rgba(16,32,43,0.2)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)]">Черновик протокола приёма</h3>
                {protocol && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      protocol.status === 'reviewed'
                        ? 'bg-[rgba(18,181,166,0.14)] text-[#0B645C] border border-[rgba(18,181,166,0.3)]'
                        : protocol.status === 'edited'
                        ? 'bg-[#E0912A]/20 text-[#A3661D] border border-[rgba(224,145,42,0.3)]'
                        : 'bg-[rgba(31,111,235,0.14)] text-[#1F6FEB] border border-[rgba(31,111,235,0.3)]'
                    }`}
                  >
                    {protocol.status === 'reviewed' ? 'Утверждён врачом' : protocol.status === 'edited' ? 'Отредактирован' : 'Черновик AI'}
                  </span>
                )}
                {cacheHit && (
                  <span className="rounded-full bg-[rgba(31,111,235,0.1)] text-[#1F6FEB] px-2 py-0.5 text-[10px] font-semibold">Из кэша (0 LLM calls)</span>
                )}
              </div>
              {protocol && (
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Модель: <span className="text-[#1F6FEB]">{protocol.provenance.generationModel}</span> ({protocol.provenance.generationProvider}) · Версия v{protocol.version}
                </p>
              )}
            </div>

            {/* Protocol Control Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setRagOpen(true)} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                <Stethoscope size={13} /> Спросить у RAG
              </Button>
              {protocol && (
                <>
                  <Button onClick={saveManualEdits} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                    <Save size={13} /> Сохранить правки
                  </Button>
                  {protocol.status !== 'reviewed' && (
                    <Button onClick={approveProtocol} size="sm" className="h-8 text-xs gap-1 bg-[#0E9E92] hover:bg-[#12B5A6] text-[var(--text-primary)]">
                      <UserCheck size={13} /> Утвердить
                    </Button>
                  )}
                  <Button onClick={() => setSaveOpen(true)} size="sm" className="h-8 gap-1 bg-[#2E86E0] text-xs text-white hover:bg-[#5B9EEA]">
                    <Save size={13} /> Сохранить приём
                  </Button>
                </>
              )}
            </div>
          </div>

          {!protocol && (
            <div className="grid min-h-[460px] place-items-center rounded-xl border border-dashed border-[var(--border-color)] p-8 text-center text-[var(--text-tertiary)]">
              <div>
                <Sparkles className="mx-auto text-[rgba(31,111,235,0.4)] mb-3" size={36} />
                <p className="text-sm font-medium text-[var(--text-secondary)]">{'Протокол ещё не сформирован'}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)] max-w-xs">
                  {'Нажмите кнопку сформировать черновик.'}
                </p>
              </div>
            </div>
          )}

          {protocol && (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {/* Disclaimer */}
              <div className="rounded-xl bg-[rgba(224,145,42,0.08)] border border-[rgba(224,145,42,0.25)] p-3 text-xs text-[#855518]">
                {protocol.warning}
              </div>

              {/* Action Toolbar: Copy, Export, Print, Regenerate */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Button onClick={copyProtocolText} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                    <Copy size={13} /> {copied ? 'OK' : 'Copy'}
                  </Button>
                  <Button onClick={downloadProtocolJson} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                    <Download size={13} /> JSON
                  </Button>
                  <Button onClick={() => setPrintMode(true)} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                    <Printer size={13} /> {'Print'}
                  </Button>
                </div>

                <Button
                  onClick={() => setConfirmRegenerateOpen(true)}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-[#A3661D] hover:text-[#855518] gap-1"
                >
                  <RefreshCw size={13} /> {'Regenerate'}
                </Button>
              </div>

              {/* Confirmation Modal for Regenerate */}
              {confirmRegenerateOpen && (
                <div className="rounded-xl border border-[#E5A04A]/30 bg-[rgba(224,145,42,0.08)] p-3 text-xs space-y-2 text-[#6B4414]">
                  <p className="font-semibold">{'Перегенерировать черновик?'}</p>
                  <p className="text-[#855518]/80">
                    {'Система создаст новую версию протокола.'}
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button onClick={() => setConfirmRegenerateOpen(false)} size="sm" variant="ghost" className="h-7 text-xs">
                      {'Отмена'}
                    </Button>
                    <Button
                      onClick={() => {
                        setConfirmRegenerateOpen(false);
                        generateProtocol(true);
                      }}
                      size="sm"
                      className="h-7 text-xs bg-[#E0912A] text-white font-semibold"
                    >
                      Да, перегенерировать
                    </Button>
                  </div>
                </div>
              )}

              {/* Editable Protocol Sections */}
              <div className="space-y-4 text-xs">
                {/* 1. History of Present Illness */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 space-y-2">
                  <label className="font-semibold text-[#124F8C] block">{'Анамнез заболевания (HPI)'}</label>
                  <textarea
                    className="input min-h-20 w-full border-[var(--border-color)] bg-[#F4F7FB] text-xs leading-5 text-[var(--text-primary)]"
                    value={protocol.sections.historyOfPresentIllness.text}
                    onChange={(e) => updateProtocolField('historyOfPresentIllness', e.target.value)}
                  />
                  {protocol.sections.historyOfPresentIllness.sourceQuotes.length > 0 && (
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      {'Цитаты из транскрипта:'} {protocol.sections.historyOfPresentIllness.sourceQuotes.map((q) => `«${q}»`).join(', ')}
                    </div>
                  )}
                </div>

                {/* 2. Assessment Summary & Preliminary Diagnosis */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 space-y-2">
                  <label className="font-semibold text-[#124F8C] block">{'Предварительный диагноз'}</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">{'Диагноз'}</label>
                      <input
                        className="input h-8 w-full border-[var(--border-color)] bg-[#F4F7FB] text-xs text-[var(--text-primary)]"
                        value={protocol.sections.assessment.preliminaryDiagnosis.diagnosis || ''}
                        onChange={(e) => updateProtocolField('preliminaryDiagnosis', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">{'Код МКБ-10'}</label>
                      <input
                        className="input h-8 w-full border-[var(--border-color)] bg-[#F4F7FB] text-xs text-[var(--text-primary)]"
                        value={protocol.sections.assessment.preliminaryDiagnosis.icd10Code || ''}
                        onChange={(e) => updateProtocolField('icd10Code', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">{'Клиническое резюме'}</label>
                    <textarea
                      className="input min-h-16 w-full border-[var(--border-color)] bg-[#F4F7FB] text-xs leading-5 text-[var(--text-primary)]"
                      value={protocol.sections.assessment.clinicalSummary}
                      onChange={(e) => updateProtocolField('assessmentSummary', e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. Chief Complaints */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 space-y-2">
                  <label className="font-semibold text-[#124F8C] block">{'Жалобы пациента'}</label>
                  <ul className="space-y-1">
                    {protocol.sections.chiefComplaints.map((item, i) => (
                      <li key={i} className="rounded bg-[#F4F7FB] p-2 text-[var(--text-primary)]">
                        • {item.text}
                        {item.sourceQuotes.length > 0 && (
                          <span className="block text-[10px] text-[var(--text-tertiary)]">{'Цитата:'} {item.sourceQuotes.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Differential Diagnoses */}
                {protocol.sections.assessment.differentialDiagnoses.length > 0 && (
                  <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 space-y-2">
                    <label className="font-semibold text-[#124F8C] block">{'Дифференциальный диагноз'}</label>
                    <div className="space-y-2">
                      {protocol.sections.assessment.differentialDiagnoses.map((diff, i) => (
                        <div key={i} className="rounded bg-[#F4F7FB] p-2 space-y-1">
                          <div className="font-semibold text-[var(--text-primary)]">{diff.diagnosis} {diff.icd10Code ? `(${diff.icd10Code})` : ''}</div>
                          {diff.supportingEvidence.length > 0 && (
                            <div className="text-[11px] text-[#0B645C]">За: {diff.supportingEvidence.join(', ')}</div>
                          )}
                          {diff.missingEvidence.length > 0 && (
                            <div className="text-[11px] text-[#A3661D]">Не хватает: {diff.missingEvidence.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Plan */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] p-3 space-y-2">
                  <label className="font-semibold text-[#124F8C] block">{'Черновик плана ведения'}</label>
                  <div className="space-y-2">
                    {protocol.sections.plan.treatmentDraft.length > 0 && (
                      <div>
                        <span className="text-[var(--text-tertiary)] block mb-1">{'Лечение:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[var(--text-primary)]">
                          {protocol.sections.plan.treatmentDraft.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {protocol.sections.plan.investigations.length > 0 && (
                      <div>
                        <span className="text-[var(--text-tertiary)] block mb-1">{'Рекомендованные исследования:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[var(--text-primary)]">
                          {protocol.sections.plan.investigations.map((inv, i) => (
                            <li key={i}>{inv}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {protocol.sections.plan.safetyNetting.length > 0 && (
                      <div>
                        <span className="text-[#A3661D] block mb-1">{'Красные флаги и предостережения:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[#6B4414]">
                          {protocol.sections.plan.safetyNetting.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Unresolved Questions */}
                {protocol.sections.unresolvedQuestions.length > 0 && (
                  <div className="rounded-xl border border-[#E5A04A]/20 bg-[rgba(224,145,42,0.05)] p-3 space-y-1">
                    <label className="font-semibold text-[#855518] block">{'Невыясненные вопросы для уточнения'}</label>
                    <ul className="list-disc list-inside space-y-1 text-[#6B4414]/90">
                      {protocol.sections.unresolvedQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <RagSidePanel
        open={ragOpen}
        onClose={() => setRagOpen(false)}
        initialSymptoms={transcriptText}
        canInsert={!!protocol}
        onInsertDiagnosis={insertDiagnosisIntoProtocol}
        onInsertSource={insertSourceIntoProtocol}
        onSourcesChange={setRagSources}
      />

      {saveOpen && protocol && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(16,32,43,0.4)] p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSaveOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="save-encounter-title" className="w-full max-w-lg rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,32,43,0.04),0_16px_40px_-14px_rgba(16,32,43,0.2)] p-6 text-[var(--text-primary)] shadow-2xl">
            {savedPatientIin ? (
              <div className="space-y-4 text-center">
                <UserCheck className="mx-auto text-[#0B645C]" size={38} />
                <h2 id="save-encounter-title" className="text-xl font-semibold">Приём сохранён</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Запись добавлена в историю пациента. Локальный черновик удалён.</p>
                <div className="rounded-xl border border-[var(--border-color)] bg-[#F4F7FB] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">ИИН пациента</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-widest text-[#1F6FEB]">{savedPatientIin}</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Link href={`/patient-portal/${savedPatientIin}`} className="focus-ring inline-flex h-10 items-center rounded-xl bg-[#2E86E0] px-4 text-sm font-semibold text-white hover:bg-[#5B9EEA]">Открыть кабинет пациента</Link>
                  <Button variant="secondary" onClick={() => setSaveOpen(false)}>Закрыть</Button>
                </div>
              </div>
            ) : needsDoctorLogin ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <Stethoscope className="mt-0.5 shrink-0 text-[#A3661D]" size={26} />
                  <div>
                    <h2 id="save-encounter-title" className="text-xl font-semibold">Войдите как врач</h2>
                    <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                      Приём сохраняется от имени врача, поэтому нужна врачебная сессия. Представьтесь один раз — и вернитесь сюда, чтобы завершить сохранение.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(31,111,235,0.25)] bg-[rgba(31,111,235,0.06)] p-3 text-xs text-[#0D3A73]">
                  Черновик протокола и введённый ИИН сохранены в этом браузере — после входа ничего вводить заново не придётся.
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="secondary" onClick={() => setSaveOpen(false)}>Отмена</Button>
                  <Button variant="secondary" onClick={() => setNeedsDoctorLogin(false)}>Повторить сохранение</Button>
                  <Link
                    href="/patient-portal/doctor"
                    className="focus-ring inline-flex h-10 items-center rounded-xl bg-[#2E86E0] px-4 text-sm font-semibold text-white hover:bg-[#5B9EEA]"
                  >
                    Войти как врач
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#1F6FEB]">Перед сохранением</p>
                  <h2 id="save-encounter-title" className="mt-2 text-xl font-semibold">Укажите пациента</h2>
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">Если ИИН ещё нет в базе, пациент будет создан автоматически.</p>
                </div>
                <label className="block text-sm font-semibold">ИИН пациента
                  <input autoFocus inputMode="numeric" maxLength={12} value={patientIin} onChange={(event) => setPatientIin(event.target.value.replace(/\D/g, '').slice(0, 12))} className="input mt-2 border-[var(--border-color)] bg-[#F4F7FB] text-[var(--text-primary)]" placeholder="12 цифр" />
                </label>
                <label className="block text-sm font-semibold">ФИО <span className="font-normal text-[var(--text-tertiary)]">(необязательно)</span>
                  <input value={patientFullName} onChange={(event) => setPatientFullName(event.target.value)} className="input mt-2 border-[var(--border-color)] bg-[#F4F7FB] text-[var(--text-primary)]" placeholder="Фамилия Имя Отчество" />
                </label>
                {saveError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}<p className="mt-1 text-xs text-red-600">Черновик сохранён локально, данные не потеряны.</p></div>}
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setSaveOpen(false)} disabled={savingEncounter}>Отмена</Button>
                  <Button onClick={saveEncounter} disabled={savingEncounter || patientIin.length !== 12} className="bg-[#2E86E0] text-white hover:bg-[#5B9EEA]">
                    {savingEncounter ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                    {savingEncounter ? 'Сохранение…' : 'Сохранить приём'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintProtocolView({ protocol }: { protocol: EncounterProtocol }) {
  const s = protocol.sections;
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="font-bold text-base border-b pb-1">1. Жалобы пациента</h2>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {s.chiefComplaints.map((c, i) => (
            <li key={i}>{c.text}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-base border-b pb-1">2. Анамнез заболевания</h2>
        <p className="mt-2 leading-relaxed">{s.historyOfPresentIllness.text || 'Не указан.'}</p>
      </section>

      <section>
        <h2 className="font-bold text-base border-b pb-1">3. Предварительный диагноз</h2>
        <p className="mt-2 font-semibold">
          {s.assessment.preliminaryDiagnosis.diagnosis || 'Неуточнённый диагноз'} ({s.assessment.preliminaryDiagnosis.icd10Code || 'R69'})
        </p>
        <p className="mt-1 text-slate-700">{s.assessment.clinicalSummary}</p>
      </section>

      <section>
        <h2 className="font-bold text-base border-b pb-1">4. Рекомендации и план ведения</h2>
        <div className="mt-2 space-y-2">
          {s.plan.treatmentDraft.length > 0 && (
            <div>
              <span className="font-semibold">Лечение:</span>
              <ul className="list-disc list-inside">
                {s.plan.treatmentDraft.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {s.plan.investigations.length > 0 && (
            <div>
              <span className="font-semibold">Обследования:</span>
              <ul className="list-disc list-inside">
                {s.plan.investigations.map((inv, i) => (
                  <li key={i}>{inv}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatProtocolAsPlainText(p: EncounterProtocol): string {
  const s = p.sections;
  return `ПРОТОКОЛ КЛИНИЧЕСКОГО ПРИЁМА
ID: ${p.protocolId} | Версия: v${p.version} | Статус: ${p.status}
Дата: ${new Date(p.provenance.generatedAt).toLocaleString('ru')}

1. ЖАЛОБЫ:
${s.chiefComplaints.map((c) => `- ${c.text}`).join('\n')}

2. АНАМНЕЗ ЗАБОЛЕВАНИЯ:
${s.historyOfPresentIllness.text}

3. ПРЕДВАРИТЕЛЬНЫЙ ДИАГНОЗ:
${s.assessment.preliminaryDiagnosis.diagnosis} (МКБ: ${s.assessment.preliminaryDiagnosis.icd10Code})
Клиническое суждение: ${s.assessment.clinicalSummary}

4. ПЛАН ВЕДЕНИЯ:
${s.plan.treatmentDraft.map((t) => `- ${t}`).join('\n')}

ПРЕДУПРЕЖДЕНИЕ: ${p.warning}`;
}
