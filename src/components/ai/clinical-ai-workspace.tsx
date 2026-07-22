'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Bot, Brain, ClipboardCheck, Loader2, Mic, RefreshCw, Search, Send, ShieldAlert, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SttEncounterWorkspace } from '@/components/ai/stt-encounter-workspace';
import { ProtocolViewer } from '@/components/ai/protocol-viewer';
import { DifferentialResults } from '@/components/ai/differential-results';
import { RagBadge } from '@/components/ai/rag-badge';
import type { DiagnoseResponse, ProtocolSource, StudentCaseDTO } from '@/domain/schemas';

type AdviceStep = { step?: string; action?: string; why?: string };
type AdviceOption = { option?: string; treatment?: string; when?: string; avoid_if?: string };
type AdviceSource = { title?: string; protocol_id?: string; source_file?: string; chunk_text?: string; excerpt?: string };
type AdviceResponse = { safety_notice: string; urgency?: string; most_likely_risks?: string[]; do_now?: AdviceStep[]; ask_or_measure_next?: string[]; treatment_options?: AdviceOption[]; referral?: { decision?: string; reason?: string }; what_not_to_do?: string[]; sources?: AdviceSource[]; rag_status?: string; rag_decision?: string };
type AdviceChatTurn = { role: 'clinician' | 'assistant'; content: string };
type AdviceChatResponse = { reply: string; questions?: string[]; need_rag?: boolean; urgency_hint?: string; safety_notice?: string };
type DialogueTurn = { speaker: 'doctor' | 'patient' | 'relative' | 'nurse' | 'unknown'; text: string; start?: number; end?: number };
type DiagnoseJobStatus = { job_id?: string; status?: string; result?: DiagnoseResponse; error?: string };

const sampleCase = 'Беременная женщина, 34 неделя беременности. Сильная головная боль, мелькание мушек перед глазами, боль в правом подреберье, выраженные отеки ног. Артериальное давление 170/110 мм рт. ст.';
const refineSample = 'Общий билирубин 36 мкмоль/л, шистоциты и признаки гемолиза подтверждены.';

const GENERIC_DIAGNOSES = [
  'R69 Неуточнённое состояние',
  'F41 Паническая атака',
  'K21.9 ГЭРБ',
  'J18.9 Пневмония',
  'I21 Острый инфаркт миокарда',
  'O14.1 Тяжёлая преэклампсия',
  'A41.9 Сепсис',
  'J06.9 ОРВИ',
  'J45.9 Бронхиальная астма',
  'E10.1 Диабетический кетоацидоз',
  'N10 Пиелонефрит',
  'K35.8 Острый аппендицит',
  'G45.9 ТИА',
  'T78.2 Анафилаксия',
  'D50.9 Железодефицитная анемия',
  'I20.0 Нестабильная стенокардия',
];

const GENERIC_TREATMENTS = [
  'наблюдение амбулаторно',
  'симптоматическое лечение',
  'контроль жизненных показателей',
  'консультация профильного специалиста',
  'повторный осмотр при ухудшении',
  'госпитализация',
  'антибиотикотерапия по протоколу',
  'обезболивание',
  'инфузионная терапия',
  'кислородотерапия',
  'ЭКГ немедленно',
  'ОАК/CRP',
  'рентген грудной клетки',
];

function getText(val: string | { ru: string; kk?: string; en?: string } | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.ru || val.en || val.kk || '';
}

function getBrief(c: StudentCaseDTO): string {
  const name = getText(c.patient?.name);
  const complaint = getText(c.complaint);
  const sex = c.patient?.sex === 'male' ? 'Мужчина' : 'Женщина';
  return `${name}, ${c.patient?.age} лет (${sex}). Жалоба: ${complaint}`;
}

function getOpening(c: StudentCaseDTO): string {
  return getText(c.complaint) || 'Здравствуйте, доктор. У меня проблемы со здоровьем.';
}

function getLevel(c: StudentCaseDTO): string {
  if (c.difficulty === 'hard') return 'Сложный';
  if (c.difficulty === 'medium') return 'Средний';
  return 'Базовый';
}

export function ClinicalAIWorkspace(props: { cases?: StudentCaseDTO[]; locale?: string } = {}) {
  const cases = props.cases || [];
  const [tab, setTab] = useState<'advice' | 'sim' | 'voice'>('voice');
  return <main className="noise min-h-[calc(100vh-4rem)] bg-[#0f1917] text-slate-100">
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-teal-300">AI Clinical Platform</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Клинический AI-ассистент</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <Tab active={tab === 'voice'} onClick={() => setTab('voice')} icon={Mic} label="STT" />
          <Tab active={tab === 'advice'} onClick={() => setTab('advice')} icon={ShieldAlert} label="Срочный совет" />
          <Tab active={tab === 'sim'} onClick={() => setTab('sim')} icon={Brain} label="Симулятор" />
        </div>
      </div>
      {tab === 'advice' && <AdvicePanel />}
      {tab === 'sim' && <SimulatorPanel cases={cases} />}
      {tab === 'voice' && <VoicePanel />}
    </section>
  </main>;
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Mic; label: string }) {
  return <button onClick={onClick} className={`focus-ring flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${active ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-white/8'}`}>
    <Icon size={16} />{label}
  </button>;
}

export function RagPanel() {
  const [symptoms, setSymptoms] = useState(sampleCase);
  const [additional, setAdditional] = useState('');
  const [data, setData] = useState<DiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function diagnose() {
    setLoading(true);
    setError('');
    const started = performance.now();
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
      setElapsedMs(performance.now() - started);
      setLoading(false);
    }
  }

  async function refine() {
    if (!data?.case_id) return diagnose();
    setLoading(true);
    setError('');
    const started = performance.now();
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
      // PRESERVE previous data on refine error!
      setError(
        e instanceof Error
          ? `Не удалось обновить: ${e.message}. Предыдущий дифференциальный ряд сохранён.`
          : 'Ошибка уточнения. Предыдущий дифференциальный ряд сохранён.',
      );
    } finally {
      setElapsedMs(performance.now() - started);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 py-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Stethoscope className="text-teal-300" />
          <h2 className="font-semibold">Клинический запрос</h2>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-300">Жалобы, анамнез, осмотр, анализы</label>
        <textarea
          className="input mt-2 min-h-72 border-white/10 bg-white/5 text-lg leading-8 text-white"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button onClick={diagnose} disabled={loading || !symptoms.trim()} className="h-12">
            <Search size={18} />
            {loading ? 'Анализ...' : 'Найти по протоколам'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSymptoms(sampleCase)}>
            Demo case
          </Button>
        </div>
        <label className="mt-6 block text-sm font-semibold text-slate-300">Ответы пациента на уточнения</label>
        <textarea
          className="input mt-2 min-h-36 border-white/10 bg-white/5 text-white"
          value={additional}
          onChange={(e) => setAdditional(e.target.value)}
          placeholder={refineSample}
        />
        <Button onClick={refine} disabled={loading || !additional.trim()} variant="secondary" className="mt-3 w-full">
          <RefreshCw size={17} />
          Уточнить без нового поиска
        </Button>
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">
          Результат поддерживает решение врача и не заменяет очную диагностику.
        </p>
      </aside>

      <section className="space-y-5">
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <span>{error}</span>
            <Button onClick={refine} size="sm" variant="secondary" className="h-8 text-xs border-red-400/40 text-red-100">
              <RefreshCw size={13} className="mr-1" /> Повторить (Retry)
            </Button>
          </div>
        )}

        {!data && <EmptyState loading={loading} />}

        {data && (
          <>
            <RagBadge
              ragStatus={data.rag_status}
              sourcesCount={data.sources?.length ?? 0}
              elapsedMs={elapsedMs}
              tone="dark"
            />
            <DifferentialResults
              diagnoses={data.diagnoses}
              sources={data.sources}
              ragStatus={data.rag_status}
              generationProvider={data.generation_provider}
            />
            <Questions questions={data.follow_up_questions ?? []} />
          </>
        )}
      </section>
    </div>
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
  return <div className="grid min-h-[520px] place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center">
    <div>{loading ? <Loader2 className="mx-auto animate-spin text-teal-300" size={38} /> : <Bot className="mx-auto text-teal-300" size={42} />}<h2 className="mt-5 text-xl font-semibold">{loading ? 'Идёт анализ протоколов' : 'Готов к анализу'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">RAG сопоставит запрос с протоколами, вернёт top-3 диагнозов, объяснения и уточняющие вопросы.</p></div>
  </div>
}

function AdvicePanel() {
  const [scenario, setScenario] = useState('Аул, ФАП. Мужчина 55 лет, давящая боль за грудиной 40 минут, отдает в левую руку, холодный пот, тошнота. АД 150/90, пульс 104, SpO2 94%. Кардиолога рядом нет, есть ЭКГ, кислород, аспирин, нитроглицерин.');
  const [role, setRole] = useState('Врач общей практики');
  const [resources, setResources] = useState('ФАП/сельская амбулатория: медсестра, врач общей практики, ЭКГ, кислород, базовые лекарства, скорая/эвакуация до районной больницы.');
  const [chat, setChat] = useState<AdviceChatTurn[]>([{ role: 'assistant', content: 'Опишите ситуацию или задайте вопрос. Я могу быстро уточнить ключевые данные, а для финального протокольного плана нажмите "Дать действия".' }]);
  const [message, setMessage] = useState('Что делать сейчас до приезда скорой?');
  const [data, setData] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  async function sendAdviceMessage() {
    const value = message.trim();
    if (!value) return;
    const next = [...chat, { role: 'clinician' as const, content: value }];
    setChat(next); setMessage(''); setChatLoading(true); setError('');
    try {
      const response = await fetch('/api/clinical/advice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'chat', scenario, role, resources, messages: next }) });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json() as AdviceChatResponse;
      const extra = (result.questions ?? []).length ? `\n\nУточнить:\n${(result.questions ?? []).map((q, i) => `${i + 1}. ${q}`).join('\n')}` : '';
      const hint = result.need_rag ? '\n\nДля точной тактики по протоколам нажмите "Дать действия".' : '';
      setChat([...next, { role: 'assistant', content: `${result.reply}${extra}${hint}` }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка консультации'); }
    finally { setChatLoading(false); }
  }
  async function askAdvice() {
    setLoading(true); setError('');
    const started = performance.now();
    try {
      const dialogue = chat.map(turn => `${turn.role === 'clinician' ? 'Медработник' : 'AI'}: ${turn.content}`).join('\n');
      const response = await fetch('/api/clinical/advice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'action', scenario: `${scenario}\n\nКороткий чат до решения:\n${dialogue}`, role, resources, messages: chat }) });
      if (!response.ok) throw new Error(await response.text());
      setData(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка консультации'); }
    finally { setElapsedMs(performance.now() - started); setLoading(false); }
  }
  return <div className="grid gap-5 py-6 lg:grid-cols-[430px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><ShieldAlert className="text-teal-300" /><h2 className="font-semibold">Срочный совет врачу</h2></div>
      <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100">AI-ассистент помогает сориентироваться по протоколам. Последнее клиническое решение принимает врач или ответственный медработник на месте.</div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Кто спрашивает</label>
      <input className="input mt-2 border-white/10 bg-white/5 text-white" value={role} onChange={e => setRole(e.target.value)} placeholder="Врач, медсестра, фельдшер" />
      <label className="mt-4 block text-sm font-semibold text-slate-300">Что есть на месте</label>
      <textarea className="input mt-2 min-h-28 border-white/10 bg-white/5 text-sm leading-6 text-white" value={resources} onChange={e => setResources(e.target.value)} />
      <label className="mt-4 block text-sm font-semibold text-slate-300">Ситуация, жалобы, витальные показатели</label>
      <textarea className="input mt-2 min-h-64 border-white/10 bg-white/5 text-lg leading-8 text-white" value={scenario} onChange={e => setScenario(e.target.value)} />
      <Button onClick={askAdvice} disabled={loading || !scenario.trim()} className="mt-4 h-12 w-full"><Search size={18} />{loading ? 'Сверяю с протоколами...' : 'Дать действия'}</Button>
    </aside>
    <section className="space-y-5">
      {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <div className="rounded-2xl border border-white/10 bg-[#162320] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><div><h2 className="text-2xl font-semibold">Быстрый чат</h2><p className="mt-1 text-sm text-slate-400">Короткие уточнения идут без тяжелого RAG. Для плана действий LLM сам решит, нужен ли долгий протокольный поиск.</p></div><Button onClick={askAdvice} disabled={loading || !scenario.trim()} variant="secondary"><ShieldAlert size={17} />{loading ? 'Анализ...' : 'Дать действия'}</Button></div>
        <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">{chat.map((turn, index) => <div key={`${index}-${turn.content}`} className={`max-w-[86%] whitespace-pre-line rounded-2xl p-4 text-sm leading-6 ${turn.role === 'clinician' ? 'ml-auto bg-teal-500/15 text-teal-50' : 'bg-white/7 text-slate-200'}`}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{turn.role === 'clinician' ? 'Медработник' : 'AI'}</span>{turn.content}</div>)}{chatLoading && <div className="rounded-2xl bg-white/7 p-4 text-sm text-slate-400">AI думает быстро...</div>}</div>
        <div className="mt-5 flex gap-2"><input className="input border-white/10 bg-white/5 text-white" value={message} placeholder="Спросите, что уточнить или что делать..." onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendAdviceMessage() }} /><Button onClick={sendAdviceMessage} disabled={chatLoading}><Send size={17} /></Button></div>
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">Если нужна конкретная тактика, нажмите “Дать действия”: лёгкий вопрос вернётся быстро, а глубокий RAG по протоколам может занять до 2-3 минут.</p>
      </div>
      {!data && <div className="grid min-h-60 place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center"><div>{loading ? <Loader2 className="mx-auto animate-spin text-teal-300" size={38} /> : <ShieldAlert className="mx-auto text-teal-300" size={42} />}<h2 className="mt-5 text-xl font-semibold">{loading ? 'Формирую план действий' : 'План действий появится здесь'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">LLM сначала решит, нужен ли RAG. Если нужен глубокий протокольный анализ, ожидание может быть до 2-3 минут.</p></div></div>}
      {data && <><RagBadge ragStatus={data.rag_status} sourcesCount={data.sources?.length ?? 0} elapsedMs={elapsedMs} tone="dark" /><div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100">{data.safety_notice}</div><div className="rounded-2xl border border-white/10 bg-[#162320] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Тактика сейчас</h2>{data.urgency && <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-100">{data.urgency}</span>}</div>{data.rag_decision && <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-400">Решение LLM-router: {data.rag_decision}</p>}<AdviceList title="Главные риски" items={data.most_likely_risks ?? []} /><StepList title="Что сделать сразу" steps={data.do_now ?? []} /><AdviceList title="Что уточнить или измерить" items={data.ask_or_measure_next ?? []} /></div><div className="grid gap-5 xl:grid-cols-2"><OptionList title="Варианты лечения" options={data.treatment_options ?? []} /><section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Маршрутизация</h3><p className="mt-3 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200">{data.referral?.decision ?? 'Уточнить по тяжести и доступности помощи.'}</p>{data.referral?.reason && <p className="mt-3 text-sm leading-6 text-slate-400">{data.referral.reason}</p>}<AdviceList title="Чего не делать" items={data.what_not_to_do ?? []} /></section></div><SourcesList sources={data.sources ?? []} status={data.rag_status} /></>}
    </section>
  </div>;
}

function AdviceList({ title, items }: { title: string; items: string[] }) { return <section className="mt-5"><h3 className="text-sm font-semibold text-slate-300">{title}</h3><div className="mt-3 grid gap-2">{items.length ? items.slice(0, 8).map(item => <div key={item} className="rounded-xl bg-white/5 p-3 text-sm leading-5 text-slate-200">{item}</div>) : <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">Недостаточно данных</div>}</div></section> }

function StepList({ title, steps }: { title: string; steps: AdviceStep[] }) { return <section className="mt-5"><h3 className="text-sm font-semibold text-slate-300">{title}</h3><ol className="mt-3 space-y-2">{steps.length ? steps.slice(0, 8).map((step, index) => <li key={`${index}-${step.step ?? step.action}`} className="rounded-xl bg-white/5 p-3 text-sm leading-5 text-slate-200"><span className="font-semibold text-teal-200">{index + 1}. {step.step ?? step.action}</span>{step.why && <p className="mt-1 text-slate-400">{step.why}</p>}</li>) : <li className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">Недостаточно данных</li>}</ol></section> }

function OptionList({ title, options }: { title: string; options: AdviceOption[] }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 grid gap-3">{options.length ? options.slice(0, 8).map((item, index) => <div key={`${index}-${item.option ?? item.treatment}`} className="rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200"><p className="font-semibold text-teal-100">{item.option ?? item.treatment}</p>{item.when && <p className="mt-1 text-slate-400">Когда: {item.when}</p>}{item.avoid_if && <p className="mt-1 text-amber-100">Осторожно/не применять: {item.avoid_if}</p>}</div>) : <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-500">Нет безопасных вариантов без уточнения данных.</p>}</div></section> }

function SourcesList({ sources, status }: { sources: AdviceSource[]; status?: string }) {
  const label = ragStatusLabel(status);
  const [viewerSource, setViewerSource] = useState<ProtocolSource | null>(null);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Источники RAG</h3>{label && <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{label}</span>}</div>
      <div className="mt-4 grid gap-3">
        {sources.length ? sources.slice(0, 5).map((source, index) => (
          <div key={`${index}-${source.title ?? source.protocol_id}`} className="rounded-xl bg-white/5 p-4 text-sm leading-6">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-200">{source.title ?? source.protocol_id ?? `Источник ${index + 1}`}</p>
              {source.protocol_id && <button type="button" onClick={() => setViewerSource({ title: source.title || source.protocol_id!, protocolId: source.protocol_id, sourceFile: source.source_file, chunkText: source.chunk_text, excerpt: source.excerpt })} className="flex shrink-0 items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2.5 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-400/20"><BookOpen size={13} />Протокол</button>}
            </div>
            {source.excerpt && <p className="mt-2 text-slate-400">{source.excerpt}</p>}
          </div>
        )) : <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-500">{status === 'llm-direct-no-rag' ? 'LLM решил, что для этого лёгкого вопроса RAG не нужен.' : 'RAG сейчас недоступен или не успел вернуть источники. Совет помечен как ограниченный.'}</p>}
      </div>
      <ProtocolViewer source={viewerSource} onClose={() => setViewerSource(null)} />
    </section>
  );
}

function Questions({ questions }: { questions: Array<{ question: string; rationale?: string }> }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Что уточнить врачу</h3><div className="mt-4 grid gap-3">{questions.slice(0, 5).map((question) => <div key={question.question} className="rounded-xl bg-white/5 p-4"><p className="font-medium">{question.question}</p>{question.rationale && <p className="mt-2 text-sm text-slate-400">{question.rationale}</p>}</div>)}</div></section>;
}

function ragStatusLabel(status?: string) {
  if (!status) return '';
  if (status === 'rag-ready') return 'RAG подключён';
  if (status === 'rag-ready-with-warning') return 'RAG подключён с предупреждением';
  if (status === 'llm-direct-no-rag') return 'Без RAG';
  if (status.startsWith('rag-job')) return 'RAG ещё не готов';
  if (status.startsWith('rag-error') || status === 'rag-limited' || status === 'rag-timeout-or-unavailable' || status === 'rag-unavailable') return 'RAG временно недоступен';
  return status;
}

function SimulatorPanel({ cases }: { cases: StudentCaseDTO[] }) {
  const [scenario, setScenario] = useState<StudentCaseDTO | null>(cases[0] || null);
  const [dialogue, setDialogue] = useState<DialogueTurn[]>(cases[0] ? [{ speaker: 'patient', text: getOpening(cases[0]) }] : []);
  const [message, setMessage] = useState('');
  const [selectedDx, setSelectedDx] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string[]>([]);
  const [revealedFactIds, setRevealedFactIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [customDiagnosis, setCustomDiagnosis] = useState('');

  const diagnosisOptions = useMemo(() => {
    if (!scenario) return GENERIC_DIAGNOSES;
    const caseDiffs = (scenario.differentials || []).map(d => `${d.code} ${getText(d.name)}`);
    return Array.from(new Set([...caseDiffs, ...GENERIC_DIAGNOSES]));
  }, [scenario]);

  const treatmentOptions = useMemo(() => {
    if (!scenario) return GENERIC_TREATMENTS;
    const caseMgmt = (scenario.managementOptions || []).map(m => getText(m.label));
    return Array.from(new Set([...caseMgmt, ...GENERIC_TREATMENTS]));
  }, [scenario]);

  function loadScenario(index: number) {
    const next = cases[index];
    setScenario(next);
    setDialogue([{ speaker: 'patient', text: getOpening(next) }]);
    setSelectedDx([]);
    setSelectedPlan([]);
    setRevealedFactIds([]);
    setFeedback('');
    setError('');
    setMessage('');
  }

  async function ask() {
    if (!message.trim() || loading || !scenario) return;
    const next = [...dialogue, { speaker: 'doctor' as const, text: message }];
    setDialogue(next);
    setMessage('');
    setLoading(true);
    setError('');
    try {
      const normalizedDialogue = next.map(t => ({
        role: t.speaker === 'doctor' ? 'student' as const : 'patient' as const,
        text: t.text,
      }));
      const response = await fetch('/api/simulator/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseId: scenario.id,
          message: message.trim(),
          locale: 'ru',
          dialogue: normalizedDialogue.slice(-12),
          revealedFactIds,
        }),
      });
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      const data = await response.json();
      setDialogue([...next, { speaker: 'patient', text: data.answer ?? 'Можете повторить вопрос?' }]);
      if (Array.isArray(data.revealedFactIds)) {
        setRevealedFactIds(data.revealedFactIds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  function toggle(value: string, list: string[], setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  function evaluate() {
    if (!scenario) return;
    setEvaluating(true);
    setFeedback('');

    const finalDx = customDiagnosis.trim() ? [...selectedDx, customDiagnosis.trim()] : selectedDx;

    const normalizedDialogue = dialogue.map(t => ({
      role: t.speaker === 'doctor' ? 'student' as const : 'patient' as const,
      text: t.text,
    }));

    fetch('/api/simulator/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: scenario.id,
        dialogue: normalizedDialogue,
        selectedDiagnoses: finalDx,
        selectedPlan
      })
    })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error(await response.text())))
      .then(data => setFeedback(data.feedback ?? 'Оценка готова.'))
      .catch((e) => setFeedback('Ошибка оценки: ' + (e instanceof Error ? e.message : 'Неизвестная ошибка')))
      .finally(() => setEvaluating(false));
  }

  const clinicalText = useMemo(() => dialogue.map(x => `${roleLabel(x.speaker)}: ${x.text}`).join('\n'), [dialogue]);

  if (!scenario) {
    return <div className="py-6 text-center text-slate-400">Нет доступных сценариев.</div>;
  }

  const publicBrief = getBrief(scenario);

  return <div className="grid gap-5 py-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Brain className="text-teal-300" /><h2 className="font-semibold">Сценарий</h2></div>
      <div className="mt-5 max-h-[430px] space-y-2 overflow-y-auto pr-1">{cases.map((item, index) => <button key={item.id} onClick={() => loadScenario(index)} className={`focus-ring w-full rounded-xl border px-3 py-3 text-left text-sm ${scenario.id === item.id ? 'border-teal-400/40 bg-teal-400/10 text-teal-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">{getLevel(item)} · {item.specialty}</span>{getText(item.title)}</button>)}</div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Открытая вводная для студента</label>
      <div className="mt-2 min-h-28 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-slate-300">{publicBrief}</div>
    </aside>
    <section className="flex flex-col rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><UserRound className="text-teal-300" /><div><h2 className="font-semibold">Приём пациента</h2><p className="mt-1 text-xs text-slate-500">{publicBrief}</p></div></div>
      {error && <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      <div className="mt-5 flex-1 max-h-[520px] space-y-3 overflow-y-auto pr-1">{dialogue.map((m, i) => <div key={i} className={`max-w-[86%] rounded-2xl p-4 text-sm leading-6 ${m.speaker === 'doctor' ? 'ml-auto bg-teal-500/15 text-teal-50' : 'bg-white/7 text-slate-200'}`}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{roleLabel(m.speaker)}</span>{m.text}</div>)}{loading && <div className="rounded-2xl bg-white/7 p-4 text-sm text-slate-400">Пациент отвечает...</div>}</div>
      <div className="mt-5 flex gap-2"><input className="input border-white/10 bg-white/5 text-white" value={message} placeholder="Задайте любой вопрос пациенту..." onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }} /><Button onClick={ask} disabled={loading}><Send size={17} /></Button></div>
      <textarea readOnly className="input mt-4 min-h-36 border-white/10 bg-white/5 text-sm leading-6 text-slate-200" value={clinicalText} />
    </section>
    <aside className="space-y-5">
      <ChoicePanel title="Диагнозы: выберите возможные" options={diagnosisOptions} selected={selectedDx} onToggle={value => toggle(value, selectedDx, setSelectedDx)} />
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h3 className="font-semibold">Свой диагноз (МКБ)</h3>
        <input className="input mt-3 border-white/10 bg-white/5 text-sm text-white" value={customDiagnosis} onChange={e => setCustomDiagnosis(e.target.value)} placeholder="Например: J06.9 ОРВИ" />
      </div>
      <ChoicePanel title="Тактика и лечение" options={treatmentOptions} selected={selectedPlan} onToggle={value => toggle(value, selectedPlan, setSelectedPlan)} />
      <Button className="w-full" onClick={evaluate} disabled={evaluating}><ClipboardCheck size={17} />{evaluating ? 'Оцениваю...' : 'Проверить выбор'}</Button>
      {feedback && <div className="rounded-2xl border border-teal-400/20 bg-teal-400/8 p-4 text-sm leading-6 text-teal-50 whitespace-pre-line">{feedback}</div>}
    </aside>
  </div>;
}

function ChoicePanel({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{options.map(option => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-5 ${selected.includes(option) ? 'border-teal-400/40 bg-teal-400/10 text-teal-50' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}><input type="checkbox" className="mt-1" checked={selected.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>)}</div></section> }

function roleLabel(role: DialogueTurn['speaker']) { return { doctor: 'Врач', patient: 'Пациент', relative: 'Родственник', nurse: 'Медсестра', unknown: 'Спикер' }[role]; }

function VoicePanel() {
  return <SttEncounterWorkspace />;
}
