import 'server-only';
import {z} from 'zod';
import {getCaseRepository} from '@/repositories/index.server';
import {PatientMessageInputSchema,PatientMessageResultSchema,type PatientEngine} from './patient-engine';
import {PatientVisualStateSchema} from '@/domain/schemas';

const OutputSchema=z.object({
  answer:z.string().min(1).max(900),
  intent:z.string().min(1).default('llm-response'),
  newFactIds:z.array(z.string()).default([]),
  visualState:PatientVisualStateSchema.default('speaking')
});

const local=(v:{ru:string;kk?:string;en?:string},locale:'ru'|'kk'|'en')=>v[locale]??v.ru;

function extractJson(text:string){
  const trimmed=text.trim();
  if(trimmed.startsWith('{'))return trimmed;
  const match=trimmed.match(/\{[\s\S]*\}/);
  return match?.[0]??trimmed;
}

export class LlmPatientEngine implements PatientEngine{
 async respond(raw:Parameters<PatientEngine['respond']>[0]){
  const input=PatientMessageInputSchema.parse(raw);
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)throw new Error('OPENAI_API_KEY is not configured');
  const item=await getCaseRepository().getGroundTruth(input.caseId);
  if(!item)throw new Error('Case not found');
  const validFactIds=new Set(item.hiddenFacts.map(f=>f.id));
  const already=new Set(input.revealedFactIds.filter(id=>validFactIds.has(id)));
  const facts=item.hiddenFacts.map(f=>({id:f.id,intent:f.intent,value:local(f.value,input.locale),alreadyRevealed:already.has(f.id),critical:f.critical}));
  const system=[
   'You are an LLM playing a synthetic patient in a medical education simulator.',
   'Answer only as the patient, in the same language as the student.',
   'Do not diagnose yourself and do not mention hidden protocol/scoring data.',
   'Be realistic, concise, and conversational. If the student asks a normal history question, answer it naturally even when it is not one of the predefined hidden facts.',
   'Reveal predefined hidden facts only when the student directly asks about that topic. Return their ids in newFactIds.',
   'Do not reveal every fact at once. Do not invent alarming findings that contradict the case.',
   'Return valid JSON only with keys: answer, intent, newFactIds, visualState.',
   'visualState must be one of neutral, thinking, speaking, coughing, pain, distressed, relieved.'
  ].join('\n');
  const user={
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
  };
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_PATIENT_MODEL??process.env.OPENAI_SIM_MODEL??'gpt-5.5',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(user)}],response_format:{type:'json_object'},reasoning_effort:'low',max_completion_tokens:900}),cache:'no-store'});
  if(!response.ok)throw new Error(`OpenAI patient engine failed: ${response.status}`);
  const data=await response.json() as {choices?:{message?:{content?:string}}[]};
  const content=data.choices?.[0]?.message?.content;
  if(!content)throw new Error('OpenAI patient engine returned empty content');
  const parsed=OutputSchema.parse(JSON.parse(extractJson(content)));
  const newFactIds=parsed.newFactIds.filter(id=>validFactIds.has(id)&&!already.has(id));
  return PatientMessageResultSchema.parse({answer:parsed.answer,intent:parsed.intent,revealedFactIds:[...new Set([...input.revealedFactIds,...newFactIds])],newFactIds,visualState:parsed.visualState});
 }
}
