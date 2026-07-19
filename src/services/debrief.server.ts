import 'server-only';
import {DebriefReferenceSchema,DebriefResultSchema,TrainingSessionSchema,type DebriefReference,type DebriefResult,type MedicalCase,type TrainingSession} from '@/domain/schemas';
import {getCaseRepository} from '@/repositories/index.server';

const local=(v:{ru:string;kk?:string;en?:string})=>v.ru;

type RagSource={protocol_id?:string;title?:string;section_type?:string;excerpt?:string;icd_codes?:string[]};

function buildRagQuery(item:MedicalCase,session?:TrainingSession){
 const revealed=item.hiddenFacts.filter(f=>session?.revealedFactIds.includes(f.id)).map(f=>local(f.value));
 const actions=session?.actions.map(a=>`${a.type}: ${a.value}`).slice(-20)??[];
 return [
  `Учебный клинический случай: ${local(item.title)}`,
  `Жалоба: ${local(item.complaint)}`,
  `Витальные показатели: ${JSON.stringify(item.vitals)}`,
  `Эталонный диагноз: ${item.correctDiagnosis.code} ${local(item.correctDiagnosis.name)}`,
  revealed.length?`Раскрытые факты: ${revealed.join('; ')}`:'',
  session?.finalDiagnosis?`Диагноз студента: ${session.finalDiagnosis}`:'',
  session?.clinicalReasoning?`Обоснование студента: ${session.clinicalReasoning}`:'',
  session?.managementNotes?`План студента: ${session.managementNotes}`:'',
  actions.length?`Ход приема: ${actions.join('; ')}`:''
 ].filter(Boolean).join('\n');
}

export async function getRagReferences(item:MedicalCase,session?:TrainingSession):Promise<DebriefReference[]>{
 const base=process.env.RAG_SERVICE_URL;
 if(!base)return [DebriefReferenceSchema.parse({title:'RAG backend не настроен для этого окружения',status:'rag-unavailable',excerpt:'Укажите RAG_SERVICE_URL, чтобы debrief подтягивал источники из протоколов.'})];
 try{
  const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({symptoms:buildRagQuery(item,session)}),cache:'no-store',signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw new Error(`RAG failed ${response.status}`);
  const data=await response.json() as {sources?:RagSource[];diagnoses?:{sources?:RagSource[]}[]};
  const raw=[...(data.sources??[]),...((data.diagnoses??[]).flatMap(d=>d.sources??[]))];
  const seen=new Set<string>();
  const refs=raw.map((s,i)=>{
   const title=s.title || s.protocol_id || `Источник RAG ${i+1}`;
   const key=`${s.protocol_id??''}:${title}:${s.excerpt??''}`;
   if(seen.has(key))return null;
   seen.add(key);
   return DebriefReferenceSchema.parse({title,status:'rag-ready',protocolId:s.protocol_id,excerpt:s.excerpt});
  }).filter(Boolean).slice(0,3) as DebriefReference[];
  return refs.length?refs:[DebriefReferenceSchema.parse({title:'RAG ответил, но источники не вернул',status:'rag-unavailable',excerpt:'Проверьте формат ответа backend /diagnose.'})];
 }catch{
  return [DebriefReferenceSchema.parse({title:'RAG backend недоступен во время debrief',status:'rag-unavailable',excerpt:'Проверьте, что Python RAG service запущен и RAG_SERVICE_URL указывает на него.'})];
 }
}

export async function getRagReferencesByCaseId(caseId:string){
 const item=await getCaseRepository().getGroundTruth(caseId);
 if(!item)throw new Error('Case not found');
 return getRagReferences(item);
}

export async function scoreSession(raw:unknown):Promise<DebriefResult>{
 const session=TrainingSessionSchema.parse(raw);
 const item=await getCaseRepository().getGroundTruth(session.caseId);
 if(!item)throw new Error('Case not found');
 const types=new Set(session.actions.map(a=>a.type));
 const correct=session.finalDiagnosis===item.correctDiagnosis.code;
 const indicated=new Set(item.investigations.filter(x=>x.indicated).map(x=>x.id));
 const unnecessary=session.selectedInvestigations.filter(x=>!indicated.has(x));
 const categories={history:Math.min(100,session.revealedFactIds.length/item.hiddenFacts.length*100),examination:types.has('examination')?85:20,investigations:Math.max(20,100-unnecessary.length*25),differential:session.differentials.length?80:20,diagnosis:correct?100:20,management:session.managementNotes.length>20?80:30,communication:types.has('communication')?90:65,critical:item.urgency==='emergency'&&session.actions.length<2?30:90};
 const total=Math.round(Object.entries(categories).reduce((sum,[key,value])=>sum+value*item.scoringRubric[key as keyof typeof item.scoringRubric]/100,0));
 const missed=item.hiddenFacts.filter(f=>!session.revealedFactIds.includes(f.id));
 return DebriefResultSchema.parse({caseId:item.id,total,categories,missedQuestions:missed.map(f=>f.value.ru),foundRedFlags:item.hiddenFacts.filter(f=>f.critical&&session.revealedFactIds.includes(f.id)).map(f=>f.value.ru),missedRedFlags:missed.filter(f=>f.critical).map(f=>f.value.ru),investigationFeedback:unnecessary.length?[`Необоснованные исследования: ${unnecessary.join(', ')}`]:['Набор исследований соответствует учебной задаче'],criticalErrors:correct?[]:['Итоговый диагноз не совпал с эталонным'],strengths:[categories.history>=70?'Системный сбор анамнеза':'Сессия завершена с клиническим обоснованием'],recommendations:['В следующем случае раньше обозначьте красные флаги','Связывайте каждое исследование с клинической гипотезой'],timeline:session.actions,referencePlaceholders:await getRagReferences(item,session),correctDiagnosis:`${item.correctDiagnosis.code} — ${item.correctDiagnosis.name.ru}`});
}
