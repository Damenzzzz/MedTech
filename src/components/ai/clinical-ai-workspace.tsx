'use client';

import {useMemo,useRef,useState} from 'react';
import {Bot,Brain,ClipboardCheck,FileAudio,Loader2,Mic,RefreshCw,Search,Send,Square,Stethoscope,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';

type Finding={finding:string;patient_evidence?:string|null};
type Diagnosis={rank:number;diagnosis:string;icd10_code:string;confidence?:string|null;why_this_diagnosis?:string|null;supporting_findings?:Finding[];missing_findings?:string[];recommended_checks?:string[]};
type Question={question:string;target_diagnoses?:string[];rationale?:string};
type DiagnoseResponse={case_id?:string|null;diagnoses:Diagnosis[];follow_up_questions?:Question[];cached_context?:boolean};
type DialogueTurn={speaker:'doctor'|'patient'|'relative'|'nurse'|'unknown';text:string;start?:number;end?:number};

const sampleCase='Беременная женщина, 34 неделя беременности. Сильная головная боль, мелькание мушек перед глазами, боль в правом подреберье, выраженные отеки ног. Артериальное давление 170/110 мм рт. ст. В анализах повышены АЛТ и АСТ, снижены тромбоциты.';
const refineSample='Общий билирубин 36 мкмоль/л, преимущественно непрямой. В мазке периферической крови обнаружены шистоциты, признаки гемолиза подтверждаются. Гаптоглобин 18 мг/дл, снижен.';

export function ClinicalAIWorkspace(){
  const [tab,setTab]=useState<'rag'|'sim'|'voice'>('rag');
  return <main className="noise min-h-[calc(100vh-4rem)] bg-[#0f1917] text-slate-100">
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-teal-300">AI Clinical Platform</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Клинический AI-ассистент</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <Tab active={tab==='rag'} onClick={()=>setTab('rag')} icon={Stethoscope} label="RAG"/>
          <Tab active={tab==='sim'} onClick={()=>setTab('sim')} icon={Brain} label="Симулятор"/>
          <Tab active={tab==='voice'} onClick={()=>setTab('voice')} icon={Mic} label="STT"/>
        </div>
      </div>
      {tab==='rag'&&<RagPanel/>}
      {tab==='sim'&&<SimulatorPanel/>}
      {tab==='voice'&&<VoicePanel/>}
    </section>
  </main>;
}

function Tab({active,onClick,icon:Icon,label}:{active:boolean;onClick:()=>void;icon:typeof Stethoscope;label:string}) {
  return <button onClick={onClick} className={`focus-ring flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${active?'bg-teal-500 text-slate-950':'text-slate-300 hover:bg-white/8'}`}>
    <Icon size={16}/>{label}
  </button>;
}

function RagPanel(){
  const [symptoms,setSymptoms]=useState(sampleCase);
  const [additional,setAdditional]=useState('');
  const [data,setData]=useState<DiagnoseResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function diagnose(){
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/clinical/diagnose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({symptoms})});
      if(!response.ok)throw new Error(await response.text());
      setData(await response.json());
    }catch(e){setError(e instanceof Error?e.message:'Ошибка анализа');}
    finally{setLoading(false);}
  }
  async function refine(){
    if(!data?.case_id)return diagnose();
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/clinical/refine',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({case_id:data.case_id,symptoms,additional_info:additional})});
      if(!response.ok)throw new Error(await response.text());
      setData(await response.json());
    }catch(e){setError(e instanceof Error?e.message:'Ошибка уточнения');}
    finally{setLoading(false);}
  }

  return <div className="grid gap-5 py-6 lg:grid-cols-[420px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Stethoscope className="text-teal-300"/><h2 className="font-semibold">Клинический запрос</h2></div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Жалобы, анамнез, осмотр, анализы</label>
      <textarea className="input mt-2 min-h-72 border-white/10 bg-white/5 text-lg leading-8 text-white" value={symptoms} onChange={e=>setSymptoms(e.target.value)}/>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={diagnose} disabled={loading||!symptoms.trim()} className="h-12"><Search size={18}/>{loading?'Анализ...':'Найти по протоколам'}</Button>
        <Button type="button" variant="secondary" onClick={()=>setSymptoms(sampleCase)}>Demo case</Button>
      </div>
      <label className="mt-6 block text-sm font-semibold text-slate-300">Ответы пациента на уточнения</label>
      <textarea className="input mt-2 min-h-36 border-white/10 bg-white/5 text-white" value={additional} onChange={e=>setAdditional(e.target.value)} placeholder={refineSample}/>
      <Button onClick={refine} disabled={loading||!additional.trim()} variant="secondary" className="mt-3 w-full"><RefreshCw size={17}/>Уточнить без нового поиска</Button>
      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">Результат поддерживает решение врача и не заменяет очную диагностику.</p>
    </aside>
    <section className="space-y-5">
      {error&&<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      {!data&&<EmptyState loading={loading}/>}
      {data&&<><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Дифференциальный ряд</h2><span className="text-sm text-slate-400">{data.diagnoses.length} вариантов</span></div><div className="grid gap-4">{data.diagnoses.slice(0,3).map(d=><DiagnosisCard key={`${d.rank}-${d.icd10_code}`} item={d}/>)}</div><Questions questions={data.follow_up_questions??[]}/></>}
    </section>
  </div>;
}

function EmptyState({loading}:{loading:boolean}){return <div className="grid min-h-[520px] place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center">
  <div>{loading?<Loader2 className="mx-auto animate-spin text-teal-300" size={38}/>:<Bot className="mx-auto text-teal-300" size={42}/>}<h2 className="mt-5 text-xl font-semibold">{loading?'Идёт анализ протоколов':'Готов к анализу'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">RAG сопоставит запрос с протоколами, вернёт top-3 диагнозов, объяснения и уточняющие вопросы.</p></div>
</div>}

function DiagnosisCard({item}:{item:Diagnosis}){return <article className="rounded-2xl border border-white/10 bg-[#162320] p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-bold text-teal-300">#{item.rank} · {item.icd10_code}{item.confidence?` · ${item.confidence}`:''}</div><h3 className="mt-2 text-xl font-semibold">{item.diagnosis}</h3></div><ClipboardCheck className="text-teal-300"/></div>
  {item.why_this_diagnosis&&<p className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200">{item.why_this_diagnosis}</p>}
  <div className="mt-4 grid gap-4 lg:grid-cols-2">
    <FactList title="Поддерживает" items={(item.supporting_findings??[]).slice(0,6).map(x=>x.patient_evidence?`${x.finding} — ${x.patient_evidence}`:x.finding)}/>
    <FactList title="Нужно уточнить" items={(item.missing_findings??item.recommended_checks??[]).slice(0,6)}/>
  </div>
</article>}

function FactList({title,items}:{title:string;items:string[]}){return <div><h4 className="text-sm font-semibold text-slate-300">{title}</h4><ul className="mt-2 space-y-2">{items.length?items.map(x=><li key={x} className="rounded-lg bg-white/5 px-3 py-2 text-sm leading-5 text-slate-300">{x}</li>):<li className="text-sm text-slate-500">Нет данных</li>}</ul></div>}

function Questions({questions}:{questions:Question[]}){return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Что уточнить врачу</h3><div className="mt-4 grid gap-3">{questions.slice(0,5).map(q=><div key={q.question} className="rounded-xl bg-white/5 p-4"><p className="font-medium">{q.question}</p>{q.rationale&&<p className="mt-2 text-sm leading-5 text-slate-400">{q.rationale}</p>}</div>)}</div></section>}

function SimulatorPanel(){
  const scenarios=[
    {
      title:'Беременность 34 недели · тяжелая преэклампсия / HELLP',
      opening:'Доктор, у меня сильная головная боль, перед глазами мелькает, и болит справа под ребрами.',
      publicBrief:'Женщина 32 лет, беременность 34 недели. Пришла с жалобами на сильную головную боль, зрительные нарушения, боль в правом подреберье и отеки.',
      hiddenContext:'Пациентка Гульмира, 32 года. Беременность 34 недели. АД дома 170/110, в приемном отделении 168/108. Есть мелькание мушек, выраженные отеки ног, боль в правом подреберье. Анализы: АЛТ/АСТ повышены, тромбоциты снижены. Протеинурия пока не проверялась. Гемолиз не подтвержден, если врач спросит про билирубин/ЛДГ/шистоциты, скажи, что результатов пока нет. Пациентка тревожится за ребенка, говорит как обычный пациент, не знает диагноз.',
      correctDiagnosis:'O14.1 Тяжелая преэклампсия; O14.2 HELLP-синдром нужно исключить.',
    },
    {
      title:'Боль в груди · острый коронарный синдром',
      opening:'У меня давит за грудиной, боль идет в левую руку, стало страшно.',
      publicBrief:'Мужчина 46 лет, внезапная давящая боль за грудиной, слабость, холодный пот.',
      hiddenContext:'Пациент Арман, 46 лет. Боль началась 40 минут назад после подъема по лестнице, давящая, за грудиной, отдает в левую руку и нижнюю челюсть. Курит 20 лет. Тошнота, холодный пот. Нитроглицерин раньше не принимал. Одышки в покое мало. Если спрашивают факторы риска: отец умер от инфаркта в 55. Пациент испуган, отвечает коротко.',
      correctDiagnosis:'I20.0 Нестабильная стенокардия / острый коронарный синдром без подъема ST до уточнения ЭКГ и тропонина.',
    },
    {
      title:'Лихорадка и кашель · пневмония',
      opening:'Температура уже четвертый день, кашляю с мокротой, идти тяжело.',
      publicBrief:'Мужчина 45 лет, температура, кашель с мокротой, слабость, одышка при ходьбе.',
      hiddenContext:'Пациент Сергей, 45 лет. Болен 4 дня. Температура до 39.1, кашель с желтоватой мокротой, боль в груди при глубоком вдохе справа, одышка при ходьбе. SpO2 91%, ЧДД 26. Контактов с туберкулезом не знает. Антибиотики не принимал. Не курит. Говорит устало, просит понять, нужно ли в больницу.',
      correctDiagnosis:'J18.9 Внебольничная пневмония, оценить тяжесть и сатурацию.',
    },
  ];
  const diagnosisOptions=['O14.1 Тяжелая преэклампсия','O14.2 HELLP-синдром','O15.0 Эклампсия','O13 Гестационная гипертензия','O10 Хроническая гипертензия при беременности','I20.0 Нестабильная стенокардия','I21 Острый инфаркт миокарда','I16.0 Гипертонический криз','J18.9 Внебольничная пневмония','J06.9 ОРВИ','K35.8 Острый аппендицит','N10 Острый пиелонефрит','E10.1 Диабетический кетоацидоз','E16.2 Гипогликемия','G45.9 ТИА','R69 Неуточненное состояние'];
  const treatmentOptions=['Срочная госпитализация/маршрутизация','Вызов акушера-гинеколога и реанимационной команды','Контроль АД, неврологического статуса и диуреза','Магния сульфат при риске судорог по протоколу','Антигипертензивная терапия по протоколу','Оценка белка мочи/креатинина/печеночных ферментов/тромбоцитов','ЛДГ, билирубин, гаптоглобин, мазок крови на шистоциты','Экстренная ЭКГ','Тропонин в динамике','Кислород при гипоксемии','Рентген/КТ грудной клетки по показаниям','Антибиотикотерапия по протоколу','Наблюдение амбулаторно','Назначить НПВС и отпустить домой','Игнорировать красные флаги','Дать только успокоительное'];
  const [scenario,setScenario]=useState(scenarios[0]);
  const [publicBrief,setPublicBrief]=useState(scenarios[0].publicBrief);
  const [hiddenContext,setHiddenContext]=useState(scenarios[0].hiddenContext);
  const [dialogue,setDialogue]=useState<DialogueTurn[]>([{speaker:'patient',text:scenarios[0].opening}]);
  const [message,setMessage]=useState('Когда началась головная боль и есть ли нарушения зрения?');
  const [selectedDx,setSelectedDx]=useState<string[]>([]);
  const [selectedPlan,setSelectedPlan]=useState<string[]>([]);
  const [feedback,setFeedback]=useState('');
  const [loading,setLoading]=useState(false);
  function loadScenario(index:number){
    const next=scenarios[index];
    setScenario(next);
    setPublicBrief(next.publicBrief);
    setHiddenContext(next.hiddenContext);
    setDialogue([{speaker:'patient',text:next.opening}]);
    setSelectedDx([]);
    setSelectedPlan([]);
    setFeedback('');
  }
  function customScenario(){
    const next={title:'Свой сценарий',opening:'Здравствуйте, доктор. Что вы хотите уточнить?',publicBrief,hiddenContext,correctDiagnosis:'Проверьте по своему скрытому контексту.'};
    setScenario(next);
    setDialogue([{speaker:'patient',text:next.opening}]);
    setSelectedDx([]);
    setSelectedPlan([]);
    setFeedback('');
  }
  async function ask(){
    if(!message.trim())return;
    const next=[...dialogue,{speaker:'doctor' as const,text:message}];
    setDialogue(next);setMessage('');setLoading(true);
    try{
      const response=await fetch('/api/simulator/respond',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseTitle:scenario.title,publicBrief,hiddenContext,dialogue:next})});
      const data=await response.json();
      setDialogue([...next,{speaker:'patient',text:data.answer??'Можете повторить вопрос?'}]);
    }finally{setLoading(false);}
  }
  function toggle(value:string,list:string[],setList:(next:string[])=>void){
    setList(list.includes(value)?list.filter(x=>x!==value):[...list,value]);
  }
  function evaluate(){
    const text=[...selectedDx,...selectedPlan].join(' ').toLowerCase();
    const misses=[];
    if(scenario.title.includes('преэклампсия')&&!text.includes('o14.1'))misses.push('Основной диагноз O14.1 не выбран.');
    if(scenario.title.includes('преэклампсия')&&!text.includes('магния'))misses.push('Не выбран магния сульфат/профилактика судорог.');
    if(scenario.title.includes('коронарный')&&!text.includes('экг'))misses.push('Для боли в груди нужна срочная ЭКГ.');
    if(scenario.title.includes('пневмония')&&!text.includes('j18.9'))misses.push('Пневмония не выбрана как основной вариант.');
    if(text.includes('игнорировать')||text.includes('отпустить домой'))misses.push('Есть опасная тактика при красных флагах.');
    setFeedback(misses.length?misses.join(' '):'Хорошо: выбранные диагнозы и тактика согласуются с ключевыми рисками сценария.');
  }
  const clinicalText=useMemo(()=>dialogue.map(x=>`${roleLabel(x.speaker)}: ${x.text}`).join('\n'),[dialogue]);
  return <div className="grid gap-5 py-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Brain className="text-teal-300"/><h2 className="font-semibold">Сценарий</h2></div>
      <div className="mt-5 grid gap-2">{scenarios.map((item,index)=><button key={item.title} onClick={()=>loadScenario(index)} className={`focus-ring rounded-xl border px-3 py-3 text-left text-sm ${scenario.title===item.title?'border-teal-400/40 bg-teal-400/10 text-teal-100':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}>{item.title}</button>)}</div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Открытая вводная для студента</label>
      <textarea className="input mt-2 min-h-28 border-white/10 bg-white/5 text-sm leading-6 text-white" value={publicBrief} onChange={e=>setPublicBrief(e.target.value)}/>
      <label className="mt-4 block text-sm font-semibold text-slate-300">Скрытый контекст пациента для LLM</label>
      <textarea className="input mt-2 min-h-52 border-white/10 bg-white/5 text-sm leading-6 text-white" value={hiddenContext} onChange={e=>setHiddenContext(e.target.value)}/>
      <Button variant="secondary" className="mt-3 w-full" onClick={customScenario}>Начать свой сценарий</Button>
      <p className="mt-4 text-xs leading-5 text-slate-500">LLM видит скрытый контекст каждый ход и отвечает только как пациент. Студент может задавать любые вопросы.</p>
    </aside>
    <section className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><UserRound className="text-teal-300"/><div><h2 className="font-semibold">Приём пациента</h2><p className="mt-1 text-xs text-slate-500">{publicBrief}</p></div></div>
      <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">{dialogue.map((m,i)=><div key={i} className={`max-w-[86%] rounded-2xl p-4 text-sm leading-6 ${m.speaker==='doctor'?'ml-auto bg-teal-500/15 text-teal-50':'bg-white/7 text-slate-200'}`}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{roleLabel(m.speaker)}</span>{m.text}</div>)}{loading&&<div className="rounded-2xl bg-white/7 p-4 text-sm text-slate-400">Пациент отвечает...</div>}</div>
      <div className="mt-5 flex gap-2"><input className="input border-white/10 bg-white/5 text-white" value={message} placeholder="Задайте любой вопрос пациенту..." onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}}/><Button onClick={ask} disabled={loading}><Send size={17}/></Button></div>
      <textarea readOnly className="input mt-4 min-h-36 border-white/10 bg-white/5 text-sm leading-6 text-slate-200" value={clinicalText}/>
    </section>
    <aside className="space-y-5">
      <ChoicePanel title="Диагнозы: выберите возможные" options={diagnosisOptions} selected={selectedDx} onToggle={value=>toggle(value,selectedDx,setSelectedDx)}/>
      <ChoicePanel title="Тактика и лечение" options={treatmentOptions} selected={selectedPlan} onToggle={value=>toggle(value,selectedPlan,setSelectedPlan)}/>
      <Button className="w-full" onClick={evaluate}><ClipboardCheck size={17}/>Проверить выбор</Button>
      {feedback&&<div className="rounded-2xl border border-teal-400/20 bg-teal-400/8 p-4 text-sm leading-6 text-teal-50">{feedback}<p className="mt-3 text-xs text-slate-400">Эталон под капотом: {scenario.correctDiagnosis}</p></div>}
    </aside>
  </div>;
}

function ChoicePanel({title,options,selected,onToggle}:{title:string;options:string[];selected:string[];onToggle:(value:string)=>void}){return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{options.map(option=><label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-5 ${selected.includes(option)?'border-teal-400/40 bg-teal-400/10 text-teal-50':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}><input type="checkbox" className="mt-1" checked={selected.includes(option)} onChange={()=>onToggle(option)}/><span>{option}</span></label>)}</div></section>}

function VoicePanel(){
  const recorder=useRef<MediaRecorder|null>(null);
  const chunks=useRef<Blob[]>([]);
  const [recording,setRecording]=useState(false);
  const [loading,setLoading]=useState(false);
  const [turns,setTurns]=useState<DialogueTurn[]>([]);
  const [error,setError]=useState('');

  async function start(){
    setError('');
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks.current=[];
    recorder.current=new MediaRecorder(stream);
    recorder.current.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
    recorder.current.onstop=async()=>{stream.getTracks().forEach(x=>x.stop());await upload(new Blob(chunks.current,{type:'audio/webm'}));};
    recorder.current.start();
    setRecording(true);
  }
  function stop(){recorder.current?.stop();setRecording(false);}
  async function upload(blob:Blob){
    setLoading(true);
    try{
      const form=new FormData();
      form.append('audio',blob,'consultation.webm');
      const response=await fetch('/api/transcribe',{method:'POST',body:form});
      if(!response.ok)throw new Error(await response.text());
      const data=await response.json();
      setTurns(data.turns??[]);
    }catch(e){setError(e instanceof Error?e.message:'Ошибка транскрибации');}
    finally{setLoading(false);}
  }
  return <div className="grid gap-5 py-6 lg:grid-cols-[380px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5"><div className="flex items-center gap-3 border-b border-white/10 pb-4"><FileAudio className="text-teal-300"/><h2 className="font-semibold">Запись приёма</h2></div><div className="mt-6 grid aspect-square place-items-center rounded-3xl border border-white/10 bg-white/[.03]"><button onClick={recording?stop:start} className={`focus-ring grid size-32 place-items-center rounded-full ${recording?'bg-red-500 text-white':'bg-teal-500 text-slate-950'}`}>{recording?<Square size={42}/>:<Mic size={46}/>}</button></div><p className="mt-5 text-sm leading-6 text-slate-400">OpenAI STT распознаёт речь и diarization разделяет спикеров. Затем роли врача/пациента нормализуются для клинического диалога.</p>{loading&&<p className="mt-4 flex items-center gap-2 text-teal-300"><Loader2 className="animate-spin" size={16}/>Расшифровка...</p>}{error&&<p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}</aside>
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-2xl font-semibold">Диалог с ролями</h2><div className="mt-5 space-y-3">{turns.length?turns.map((t,i)=><div key={`${i}-${t.text}`} className="rounded-xl bg-white/5 p-4"><div className="text-xs font-bold uppercase text-teal-300">{roleLabel(t.speaker)} {typeof t.start==='number'?`· ${t.start.toFixed(1)}s`:''}</div><p className="mt-2 leading-6 text-slate-200">{t.text}</p></div>):<div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-white/10 text-slate-500">Запишите или загрузите аудио приёма</div>}</div></section>
  </div>;
}

function roleLabel(role:DialogueTurn['speaker']){return {doctor:'Врач',patient:'Пациент',relative:'Родственник',nurse:'Медсестра',unknown:'Спикер'}[role];}
