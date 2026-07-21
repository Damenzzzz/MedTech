'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, Loader2, RefreshCw, Search, Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifferentialResults } from '@/components/ai/differential-results';
import type { DiagnoseResponse, DiagnosisItem, ProtocolSource } from '@/domain/schemas';

type Question = { question: string; target_diagnoses?: string[]; rationale?: string };
type DiagnoseJobStatus = { job_id?: string; status?: string; result?: DiagnoseResponse; error?: string };

const sampleCase = 'Беременная женщина, 34 неделя беременности. Сильная головная боль, мелькание мушек перед глазами, боль в правом подреберье, выраженные отеки ног. Артериальное давление 170/110 мм рт. ст. В анализах повышены АЛТ и АСТ, снижены тромбоциты.';
const refineSample = 'Общий билирубин 36 мкмоль/л, преимущественно непрямой. В мазке периферической крови обнаружены шистоциты, признаки гемолиза подтверждаются. Гаптоглобин 18 мг/дл, снижен.';

export function RagSidePanel({
  open,
  onClose,
  initialSymptoms,
  canInsert,
  onInsertDiagnosis,
  onInsertSource,
}: {
  open: boolean;
  onClose: () => void;
  initialSymptoms: string;
  canInsert: boolean;
  onInsertDiagnosis: (item: DiagnosisItem) => void;
  onInsertSource: (source: ProtocolSource) => void;
}) {
  const [symptoms, setSymptoms] = useState(initialSymptoms || sampleCase);
  const [additional, setAdditional] = useState('');
  const [data, setData] = useState<DiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  // Re-seed the symptoms textarea from the live transcript each time the panel opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSymptoms(initialSymptoms || sampleCase);
  }

  async function diagnose() {
    setLoading(true);
    setError('');
    try {
      const job = await startDiagnoseJob(symptoms);
      if (job?.job_id) {
        const result = (await waitDiagnoseJob(job.job_id)) as DiagnoseResponse;
        setData(result);
      } else {
        const response = await fetch('/api/clinical/diagnose', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ symptoms }),
        });
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({ error: 'Ошибка анализа' }));
          throw new Error(errJson.error || `Ошибка сервера ${response.status}`);
        }
        const result: DiagnoseResponse = await response.json();
        setData(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка анализа');
    } finally {
      setLoading(false);
    }
  }

  async function refine() {
    if (!data?.case_id) return diagnose();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/clinical/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: data.case_id,
          symptoms,
          additional_info: additional,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Ошибка уточнения' }));
        throw new Error(errJson.error || `Ошибка уточнения ${response.status}`);
      }

      const result: DiagnoseResponse = await response.json();
      setData(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Не удалось обновить: ${e.message}. Предыдущий дифференциальный ряд сохранён.`
          : 'Ошибка уточнения. Предыдущий дифференциальный ряд сохранён.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto border-l border-white/10 bg-[#0f1917] p-5 text-slate-100 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="text-teal-300" />
                <h2 className="font-semibold">Спросить у RAG</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-300">Жалобы, анамнез, осмотр, анализы</label>
            <textarea
              className="input mt-2 min-h-40 border-white/10 bg-white/5 text-sm leading-6 text-white"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button onClick={diagnose} disabled={loading || !symptoms.trim()} className="h-11">
                <Search size={16} />
                {loading ? 'Анализ...' : 'Найти по протоколам'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSymptoms(sampleCase)}>
                Demo case
              </Button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-300">Ответы пациента на уточнения</label>
            <textarea
              className="input mt-2 min-h-24 border-white/10 bg-white/5 text-sm text-white"
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
              placeholder={refineSample}
            />
            <Button onClick={refine} disabled={loading || !additional.trim()} variant="secondary" className="mt-3 w-full">
              <RefreshCw size={16} />
              Уточнить без нового поиска
            </Button>

            {!canInsert && (
              <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">
                Сначала сформируйте черновик протокола — тогда найденные диагнозы и источники можно будет добавить в него одним кликом.
              </p>
            )}

            <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
              {error && (
                <div className="flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                  <span>{error}</span>
                  <Button onClick={refine} size="sm" variant="secondary" className="h-8 text-xs border-red-400/40 text-red-100">
                    <RefreshCw size={13} className="mr-1" /> Повторить
                  </Button>
                </div>
              )}

              {!data && <EmptyState loading={loading} />}

              {data && (
                <>
                  <DifferentialResults
                    diagnoses={data.diagnoses}
                    sources={data.sources}
                    ragStatus={data.rag_status}
                    generationProvider={data.generation_provider}
                    canInsert={canInsert}
                    onInsertDiagnosis={onInsertDiagnosis}
                    onInsertSource={onInsertSource}
                  />
                  <Questions questions={data.follow_up_questions ?? []} />
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

async function startDiagnoseJob(symptoms: string) {
  try {
    const response = await fetch('/api/clinical/diagnose/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symptoms }) });
    if (!response.ok) return null;
    return await response.json() as DiagnoseJobStatus;
  } catch { return null; }
}

async function waitDiagnoseJob(jobId: string) {
  const deadline = Date.now() + 300000;
  let lastError = '';
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 3500));
    try {
      const response = await fetch(`/api/clinical/diagnose/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
      if (!response.ok) { lastError = await response.text(); continue; }
      const data = await response.json() as DiagnoseJobStatus;
      if (data.status === 'completed' && data.result) return data.result;
      if (data.status === 'failed' || data.status === 'not_found') throw new Error(`RAG job ${data.status}`);
    } catch (e) { lastError = e instanceof Error ? e.message : lastError; }
  }
  throw new Error(lastError || 'RAG анализ занял больше 5 минут');
}

function EmptyState({ loading }: { loading: boolean }) {
  return <div className="grid min-h-[320px] place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center">
    <div>{loading ? <Loader2 className="mx-auto animate-spin text-teal-300" size={38} /> : <Bot className="mx-auto text-teal-300" size={42} />}<h2 className="mt-5 text-xl font-semibold">{loading ? 'Идёт анализ протоколов' : 'Готов к анализу'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">RAG сопоставит запрос с протоколами, вернёт top-3 диагнозов, объяснения и уточняющие вопросы.</p></div>
  </div>
}

function Questions({ questions }: { questions: Question[] }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Что уточнить врачу</h3><div className="mt-4 grid gap-3">{questions.slice(0, 5).map(q => <div key={q.question} className="rounded-xl bg-white/5 p-4"><p className="font-medium">{q.question}</p>{q.rationale && <p className="mt-2 text-sm leading-5 text-slate-400">{q.rationale}</p>}</div>)}</div></section> }
