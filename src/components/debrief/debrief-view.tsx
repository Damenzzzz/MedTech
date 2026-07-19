'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,ArrowRight,BookOpen,CheckCircle2,RotateCcw,Target} from 'lucide-react';
import {motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {DebriefResultSchema,type DebriefReference,type DebriefResult} from '@/domain/schemas';
import {Link} from '@/i18n/navigation';

export function DebriefView({caseId}:{caseId:string}){
 const t=useTranslations('Debrief');
 const c=useTranslations('Common');
 const [data,setData]=useState<DebriefResult|null>(null);
 useEffect(()=>{
  const raw=localStorage.getItem(`kms-debrief-${caseId}`);
  if(!raw)return;
  const parsed=DebriefResultSchema.parse(JSON.parse(raw));
  setData(parsed);
  if(parsed.referencePlaceholders.some(x=>x.status==='rag-pending')){
   fetch(`/api/session/references?caseId=${encodeURIComponent(caseId)}`).then(r=>r.ok?r.json():null).then(payload=>{
    if(!payload?.references?.length)return;
    const next=DebriefResultSchema.parse({...parsed,referencePlaceholders:payload.references});
    localStorage.setItem(`kms-debrief-${caseId}`,JSON.stringify(next));
    setData(next);
   }).catch(()=>{});
  }
 },[caseId]);
 if(!data)return <div className="card rounded-3xl p-12 text-center"><p>{c('loading')}</p><Link href={`/training/${caseId}`} className="mt-5 inline-flex text-teal-700">{t('repeat')}</Link></div>;
 const labels:Record<string,string>={history:t('history'),examination:t('examination'),investigations:t('investigations'),differential:t('differential'),diagnosis:t('diagnosis'),management:t('management'),communication:t('communication'),critical:t('critical')};
 return <div><p className="label text-teal-700">{t('eyebrow')}</p><div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><h1 className="text-4xl font-semibold">{t('title')}</h1><p className="mt-3 text-slate-500">{t('correct')}: <b>{data.correctDiagnosis}</b></p></div><div className="flex items-baseline gap-2 rounded-2xl bg-[#132320] px-6 py-4 text-white"><span className="text-4xl font-semibold text-teal-300">{data.total}</span><span className="text-sm text-slate-400">/ 100</span></div></div><section className="card mt-8 rounded-3xl p-6"><h2 className="text-xl font-semibold">{t('rubric')}</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{Object.entries(data.categories).map(([key,value],i)=><motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*.05}} key={key}><div className="flex justify-between text-sm"><span>{labels[key]??key}</span><b>{Math.round(value)}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><motion.div initial={{width:0}} animate={{width:`${value}%`}} transition={{duration:.7,delay:i*.05}} className={`h-full rounded-full ${value<50?'bg-red-500':value<75?'bg-amber-400':'bg-teal-500'}`}/></div></motion.div>)}</div></section><div className="mt-6 grid gap-6 lg:grid-cols-2"><Feedback icon={AlertTriangle} title={t('missed')} items={data.missedQuestions}/><Feedback icon={Target} title={t('redFlags')} items={[...data.foundRedFlags,...data.missedRedFlags]}/><Feedback icon={BookOpen} title={t('investigationFeedback')} items={data.investigationFeedback}/><Feedback icon={AlertTriangle} title={t('criticalErrors')} items={data.criticalErrors}/><Feedback icon={CheckCircle2} title={t('strengths')} items={data.strengths}/><Feedback icon={ArrowRight} title={t('recommendations')} items={data.recommendations}/></div><section className="card mt-6 rounded-3xl p-6"><h2 className="text-xl font-semibold">{t('timeline')}</h2><ol className="mt-5 space-y-3">{data.timeline.map((a,i)=><li key={a.id} className="flex gap-4 text-sm"><span className="text-slate-400">{String(i+1).padStart(2,'0')}</span><span className="font-medium">{a.type}</span><span className="text-slate-500">{a.value}</span></li>)}</ol></section><RagReferences title={t('references')} refs={data.referencePlaceholders}/><div className="mt-8 flex flex-wrap gap-3"><Link href={`/training/${caseId}`} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold dark:border-white/20"><RotateCcw size={17}/>{t('repeat')}</Link><Link href="/patients" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 font-semibold text-white">{t('nextCase')}<ArrowRight size={17}/></Link></div></div>;
}

function RagReferences({title,refs}:{title:string;refs:DebriefReference[]}){
 const label=(status:DebriefReference['status'])=>status==='rag-ready'?'RAG подключён':status==='rag-unavailable'?'RAG недоступен':'Загрузка RAG';
 return <section className="mt-6 rounded-3xl border border-dashed border-slate-300 p-6 dark:border-white/15"><div className="flex items-center gap-3"><BookOpen className="text-teal-600"/><h2 className="text-xl font-semibold">{title}</h2></div>{refs.map(x=><div key={`${x.protocolId??''}-${x.title}`} className="mt-4 rounded-xl bg-slate-100 p-4 text-sm dark:bg-white/5"><div className="flex justify-between gap-4"><span className="font-medium">{x.title}</span><span className={x.status==='rag-ready'?'text-teal-600':'text-amber-600'}>{label(x.status)}</span></div>{x.excerpt&&<p className="mt-3 leading-6 text-slate-600 dark:text-slate-300">{x.excerpt}</p>}{x.protocolId&&<p className="mt-2 text-xs text-slate-400">{x.protocolId}</p>}</div>)}</section>;
}

function Feedback({icon:Icon,title,items}:{icon:typeof Target;title:string;items:string[]}){
 return <section className="card rounded-2xl p-6"><div className="flex items-center gap-3"><Icon size={19} className="text-teal-700"/><h2 className="font-semibold">{title}</h2></div>{items.length?<ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{items.map(x=><li key={x}>• {x}</li>)}</ul>:<p className="mt-4 text-sm text-emerald-600">✓</p>}</section>;
}
