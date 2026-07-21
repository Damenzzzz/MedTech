'use client';

import { useMemo, useRef, useState } from 'react';
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
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  EncounterProtocol,
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
    setState(audioBlob ? 'idle' : 'idle');
  }

  // Protocol Generation Handler
  async function generateProtocol(forceRegenerate = false) {
    if (!sttData && !transcriptText.trim() && !turns.length) return;

    setErrorMessage('');
    setState('generating-protocol');

    const payload = {
      transcriptId: sttData?.transcriptId || `tr-manual-${Date.now()}`,
      transcriptText: transcriptText.trim(),
      turns,
      locale: 'ru',
      regenerate: forceRegenerate,
    };

    try {
      const response = await fetch('/api/encounter/protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
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
      setProtocol(newProtocol);
      setState('protocol-ready');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка генерации протокола.');
    }
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

  // Speaker turns editing
  function updateTurnSpeaker(index: number, newSpeaker: SttSpeaker) {
    const next = [...turns];
    next[index] = { ...next[index], speaker: newSpeaker };
    setTurns(next);
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
              <p className="text-sm text-slate-500">ID: {protocol.protocolId} · Дата: {new Date(protocol.provenance.generatedAt).toLocaleString('ru')}</p>
            </div>
            <Button onClick={() => window.print()} variant="secondary"><Printer size={16} />Печать</Button>
            <Button onClick={() => setPrintMode(false)} variant="secondary">Назад к редактору</Button>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">{protocol.warning}</div>
          <PrintProtocolView protocol={protocol} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* 1. Privacy & Patient Consent Banner */}
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} />
          <div>
            <span className="font-semibold text-amber-200">Требуется согласие пациента:</span> Запись разговора и формирование черновика протокола выполняется только с согласия пациента. Данное демо не сохраняет персональные идентифицируемые медицинские данные в публичное хранилище. Ответственность за проверку и утверждение протокола лежит на лечащем враче.
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/20">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            className="rounded text-teal-400 focus:ring-0"
          />
          <span>Согласие получено</span>
        </label>
      </div>

      {/* 2. Audio Recording Control Panel */}
      <div className="rounded-2xl border border-white/10 bg-[#162320] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileAudio className="text-teal-300" size={22} />
            <div>
              <h2 className="font-semibold text-white">Запись и STT (OpenAI Speech-to-Text)</h2>
              <p className="text-xs text-slate-400">OpenAI используется исключительно для распознавания речи (POST /v1/audio/transcriptions).</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input h-10 w-32 border-white/10 bg-white/5 text-xs text-white"
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
                className="h-10 gap-2 bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400"
              >
                <Mic size={16} /> Записать приём
              </Button>
            )}
          </div>
        </div>

        {/* Audio Player and Send Controls */}
        {audioUrl && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <audio ref={audioPlayerRef} src={audioUrl} controls className="h-8 max-w-xs" />
              <span className="text-xs text-slate-400">Запись ({formatTimer})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={deleteAudio} variant="secondary" size="sm" className="h-9 gap-1 text-red-300 hover:text-red-200">
                <Trash2 size={15} /> Удалить запись
              </Button>
              <Button
                onClick={runTranscription}
                disabled={state === 'transcribing' || state === 'uploading'}
                size="sm"
                className="h-9 gap-1 bg-teal-500 text-slate-950 hover:bg-teal-400 font-medium"
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
          <div className="mt-3 flex items-center justify-between rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
            <span>{errorMessage}</span>
            {audioBlob && (
              <Button onClick={runTranscription} size="sm" variant="secondary" className="h-7 text-xs border-red-400/40 text-red-100">
                <RotateCcw size={12} className="mr-1" /> Повторить STT
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Two-Pane Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT PANE: Transcript & Speaker Turns Editor */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-[#162320] p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FileText className="text-teal-300" size={18} /> Расшифровка разговора
              </h3>
              {sttData && (
                <p className="mt-1 text-xs text-slate-400">
                  Провайдер: <span className="text-teal-300">{sttData.provider}</span> ({sttData.model}) · Длительность: {sttData.durationSeconds.toFixed(1)}s
                </p>
              )}
            </div>
            {transcriptText && (
              <Button onClick={deleteTranscript} variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-red-300">
                <Trash2 size={14} /> Очистить
              </Button>
            )}
          </div>

          {sttData?.provider === 'mock' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>Это демо-текст (mock STT), не настоящая транскрибация записи.</span>
            </div>
          )}

          {/* Full Transcript Text Area */}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">Полный текст транскрипта (можно редактировать)</label>
            <textarea
              className="input min-h-32 border-white/10 bg-white/5 text-sm leading-6 text-slate-100"
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Здесь появится расшифровка разговора врачом и пациентом..."
            />
          </div>

          {/* Speaker Turns List */}
          <div className="mt-5 flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Разделение по спикерам (Diarization)</label>
              <Button onClick={addTurn} variant="ghost" size="sm" className="h-7 text-xs text-teal-300">
                <Plus size={14} className="mr-1" /> Добавить реплику
              </Button>
            </div>

            <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {turns.length ? (
                turns.map((turn, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        className="input h-7 border-white/10 bg-white/10 text-xs font-bold text-teal-200"
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
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-300"
                        >
                          <Play size={10} /> {turn.start.toFixed(1)}s - {turn.end?.toFixed(1)}s
                        </button>
                      )}

                      <button type="button" onClick={() => removeTurn(idx)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <textarea
                      className="input min-h-16 w-full border-white/5 bg-black/20 text-xs leading-5 text-slate-200"
                      value={turn.text}
                      onChange={(e) => updateTurnText(idx, e.target.value)}
                    />
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                  Реплики спикеров появятся после транскрибации или ввода текста.
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Generate Protocol */}
          <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between">
            <Button
              onClick={() => generateProtocol(false)}
              disabled={!transcriptText.trim() && !turns.length}
              className="w-full h-11 bg-teal-500 text-slate-950 font-semibold hover:bg-teal-400 gap-2"
            >
              {state === 'generating-protocol' ? (
                <>
                  <Loader2 className="animate-spin" size={17} /> AlemLLM формирует протокол...
                </>
              ) : (
                <>
                  <Sparkles size={17} /> Сформировать черновик протокола (AlemLLM)
                </>
              )}
            </Button>
          </div>
        </section>

        {/* RIGHT PANE: Structured Protocol Editor */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-[#162320] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Черновик протокола приёма</h3>
                {protocol && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      protocol.status === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : protocol.status === 'edited'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    }`}
                  >
                    {protocol.status === 'reviewed' ? 'Утверждён врачом' : protocol.status === 'edited' ? 'Отредактирован' : 'Черновик AI'}
                  </span>
                )}
                {cacheHit && (
                  <span className="rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 text-[10px]">Из кэша (0 LLM calls)</span>
                )}
              </div>
              {protocol && (
                <p className="mt-1 text-xs text-slate-400">
                  Модель: <span className="text-teal-300">{protocol.provenance.generationModel}</span> ({protocol.provenance.generationProvider}) · Версия v{protocol.version}
                </p>
              )}
            </div>

            {/* Protocol Control Buttons */}
            {protocol && (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={saveManualEdits} size="sm" variant="secondary" className="h-8 text-xs gap-1">
                  <Save size={13} /> Сохранить
                </Button>
                {protocol.status !== 'reviewed' && (
                  <Button onClick={approveProtocol} size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                    <UserCheck size={13} /> Утвердить
                  </Button>
                )}
              </div>
            )}
          </div>

          {!protocol && (
            <div className="grid min-h-[460px] place-items-center rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500">
              <div>
                <Sparkles className="mx-auto text-teal-400/50 mb-3" size={36} />
                <p className="text-sm font-medium text-slate-300">{'Протокол ещё не сформирован'}</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  {'Нажмите кнопку сформировать черновик.'}
                </p>
              </div>
            </div>
          )}

          {protocol && (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {/* Disclaimer */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200">
                {protocol.warning}
              </div>

              {/* Action Toolbar: Copy, Export, Print, Regenerate */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
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
                  className="h-8 text-xs text-amber-300 hover:text-amber-200 gap-1"
                >
                  <RefreshCw size={13} /> {'Regenerate'}
                </Button>
              </div>

              {/* Confirmation Modal for Regenerate */}
              {confirmRegenerateOpen && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs space-y-2 text-amber-100">
                  <p className="font-semibold">{'Перегенерировать черновик?'}</p>
                  <p className="text-amber-200/80">
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
                      className="h-7 text-xs bg-amber-500 text-slate-950 font-semibold"
                    >
                      Да, перегенерировать
                    </Button>
                  </div>
                </div>
              )}

              {/* Editable Protocol Sections */}
              <div className="space-y-4 text-xs">
                {/* 1. History of Present Illness */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <label className="font-semibold text-teal-200 block">{'Анамнез заболевания (HPI)'}</label>
                  <textarea
                    className="input min-h-20 w-full border-white/10 bg-black/20 text-xs leading-5 text-slate-200"
                    value={protocol.sections.historyOfPresentIllness.text}
                    onChange={(e) => updateProtocolField('historyOfPresentIllness', e.target.value)}
                  />
                  {protocol.sections.historyOfPresentIllness.sourceQuotes.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      {'Цитаты из транскрипта:'} {protocol.sections.historyOfPresentIllness.sourceQuotes.map((q) => `«${q}»`).join(', ')}
                    </div>
                  )}
                </div>

                {/* 2. Assessment Summary & Preliminary Diagnosis */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <label className="font-semibold text-teal-200 block">{'Предварительный диагноз'}</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-1">{'Диагноз'}</label>
                      <input
                        className="input h-8 w-full border-white/10 bg-black/20 text-xs text-white"
                        value={protocol.sections.assessment.preliminaryDiagnosis.diagnosis || ''}
                        onChange={(e) => updateProtocolField('preliminaryDiagnosis', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">{'Код МКБ-10'}</label>
                      <input
                        className="input h-8 w-full border-white/10 bg-black/20 text-xs text-white"
                        value={protocol.sections.assessment.preliminaryDiagnosis.icd10Code || ''}
                        onChange={(e) => updateProtocolField('icd10Code', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{'Клиническое резюме'}</label>
                    <textarea
                      className="input min-h-16 w-full border-white/10 bg-black/20 text-xs leading-5 text-slate-200"
                      value={protocol.sections.assessment.clinicalSummary}
                      onChange={(e) => updateProtocolField('assessmentSummary', e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. Chief Complaints */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <label className="font-semibold text-teal-200 block">{'Жалобы пациента'}</label>
                  <ul className="space-y-1">
                    {protocol.sections.chiefComplaints.map((item, i) => (
                      <li key={i} className="rounded bg-black/20 p-2 text-slate-200">
                        • {item.text}
                        {item.sourceQuotes.length > 0 && (
                          <span className="block text-[10px] text-slate-400">{'Цитата:'} {item.sourceQuotes.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Differential Diagnoses */}
                {protocol.sections.assessment.differentialDiagnoses.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <label className="font-semibold text-teal-200 block">{'Дифференциальный диагноз'}</label>
                    <div className="space-y-2">
                      {protocol.sections.assessment.differentialDiagnoses.map((diff, i) => (
                        <div key={i} className="rounded bg-black/20 p-2 space-y-1">
                          <div className="font-semibold text-slate-200">{diff.diagnosis} {diff.icd10Code ? `(${diff.icd10Code})` : ''}</div>
                          {diff.supportingEvidence.length > 0 && (
                            <div className="text-[11px] text-emerald-300">За: {diff.supportingEvidence.join(', ')}</div>
                          )}
                          {diff.missingEvidence.length > 0 && (
                            <div className="text-[11px] text-amber-300">Не хватает: {diff.missingEvidence.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Plan */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <label className="font-semibold text-teal-200 block">{'Черновик плана ведения'}</label>
                  <div className="space-y-2">
                    {protocol.sections.plan.treatmentDraft.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1">{'Лечение:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-200">
                          {protocol.sections.plan.treatmentDraft.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {protocol.sections.plan.investigations.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1">{'Рекомендованные исследования:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-200">
                          {protocol.sections.plan.investigations.map((inv, i) => (
                            <li key={i}>{inv}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {protocol.sections.plan.safetyNetting.length > 0 && (
                      <div>
                        <span className="text-amber-300 block mb-1">{'Красные флаги и предостережения:'}</span>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-100">
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
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 space-y-1">
                    <label className="font-semibold text-amber-200 block">{'Невыясненные вопросы для уточнения'}</label>
                    <ul className="list-disc list-inside space-y-1 text-amber-100/90">
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
