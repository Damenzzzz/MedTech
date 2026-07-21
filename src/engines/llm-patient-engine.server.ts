import 'server-only';
import {z} from 'zod';
import {getCaseRepository} from '@/repositories/index.server';
import {PatientMessageInputSchema,PatientMessageResultSchema,type PatientEngine} from './patient-engine';
import {PatientVisualStateSchema} from '@/domain/schemas';
import {callClinicalJson} from '@/lib/llm';

const OutputSchema=z.object({
  answer:z.string().min(1).max(900),
  intent:z.string().min(1).default('llm-response'),
  newFactIds:z.array(z.string()).default([]),
  visualState:PatientVisualStateSchema.default('speaking')
});

const local=(v:{ru:string;kk?:string;en?:string},locale:'ru'|'kk'|'en')=>v[locale]??v.ru;

export class LlmPatientEngine implements PatientEngine{
 async respond(raw:Parameters<PatientEngine['respond']>[0]){
  const input=PatientMessageInputSchema.parse(raw);
  const item=await getCaseRepository().getGroundTruth(input.caseId);
  if(!item)throw new Error('Case not found');
  const validFactIds=new Set(item.hiddenFacts.map(f=>f.id));
  const already=new Set(input.revealedFactIds.filter(id=>validFactIds.has(id)));
  const facts=item.hiddenFacts.map(f=>({id:f.id,intent:f.intent,value:local(f.value,input.locale),alreadyRevealed:already.has(f.id),critical:f.critical}));
  const system=[
   'Ты LLM, который играет синтетического пациента в медицинском учебном симуляторе.',
   'Отвечай только как пациент и строго на русском языке.',
   'Не ставь себе диагноз и не упоминай скрытые протоколы, МКБ, диагноз, план лечения или scoring data.',
   'Будь реалистичным, кратким и разговорным. Если студент задает обычный вопрос анамнеза, отвечай естественно, даже если это не один из заранее заданных hidden facts.',
   'Раскрывай predefined hidden facts только когда студент прямо спрашивает об этой теме. Их id верни в newFactIds.',
   'Не раскрывай все факты сразу. Не выдумывай тревожные признаки, которые противоречат сценарию.',
   'Верни только валидный JSON с ключами: answer, intent, newFactIds, visualState.',
   'Поле answer должно быть строго на русском языке.',
   'visualState должен быть одним из: neutral, thinking, speaking, coughing, pain, distressed, relieved.'
  ].join('\n');
  const prompt=JSON.stringify({
   locale:input.locale,
   studentQuestion:input.message,
   patient:{
    name:local(item.patient.name,input.locale),
    age:item.patient.age,
    sex:item.patient.sex,
    complaint:local(item.complaint,input.locale),
    vitals:item.vitals
   },
   conversation:input.dialogue.slice(-12),
   privateForConsistencyOnly:{
    correctDiagnosis:`${item.correctDiagnosis.code} ${local(item.correctDiagnosis.name,input.locale)}`,
    hiddenFacts:facts
   }
  },null,2);
  const response=await callClinicalJson<z.infer<typeof OutputSchema>>(prompt,{system,maxTokens:900,timeoutMs:30000});
  const parsed=response?OutputSchema.parse(response):fallbackPatientResponse(input.message,facts);
  const newFactIds=parsed.newFactIds.filter(id=>validFactIds.has(id)&&!already.has(id));
  return PatientMessageResultSchema.parse({answer:parsed.answer,intent:parsed.intent,revealedFactIds:[...new Set([...input.revealedFactIds,...newFactIds])],newFactIds,visualState:parsed.visualState});
 }
}

function fallbackPatientResponse(question:string,facts:{id:string;intent:string;value:string;alreadyRevealed:boolean;critical:boolean}[]) {
  const lower=question.toLowerCase();
  const selected=facts.find(f=>!f.alreadyRevealed && (
   lower.includes(f.intent.toLowerCase()) ||
   f.value.toLowerCase().split(/\s+/).some(word=>word.length>5 && lower.includes(word.slice(0,5)))
  ))??facts.find(f=>!f.alreadyRevealed)??facts[0];
  return OutputSchema.parse({
   answer:selected?.value??'Мне трудно ответить. Уточните, пожалуйста, вопрос.',
   intent:selected?.intent??'fallback-response',
   newFactIds:selected&&!selected.alreadyRevealed?[selected.id]:[],
   visualState:selected?.critical?'pain':'speaking',
  });
}
