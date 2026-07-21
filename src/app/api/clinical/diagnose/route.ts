import {NextResponse} from 'next/server';
import {callClinicalJson} from '@/lib/llm';

export const maxDuration=300;

export async function POST(request:Request) {
  const body=await request.json();
  const base=process.env.RAG_SERVICE_URL;
  if (base) {
    try {
      const jobResult=await diagnoseViaJob(base, body);
      if (jobResult) return NextResponse.json(jobResult);
      const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(180000)});
      if (response.ok) return NextResponse.json(await response.json());
    } catch {}
  }
  return NextResponse.json(await alemClinicalFallback(String(body.symptoms??'')));
}

async function diagnoseViaJob(base:string, body:unknown) {
  const root=base.replace(/\/$/,'');
  try {
    const start=await fetch(`${root}/api/diagnose-jobs`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(body),
      cache:'no-store',
      signal:AbortSignal.timeout(8000),
    });
    if (!start.ok) return null;
    const started=await start.json() as {job_id?:string;result?:unknown};
    if (started.result) return started.result;
    if (!started.job_id) return null;
    const deadline=Date.now()+185000;
    while (Date.now()<deadline) {
      await sleep(3500);
      const statusResponse=await fetch(`${root}/api/diagnose-jobs/${started.job_id}`,{
        cache:'no-store',
        signal:AbortSignal.timeout(8000),
      });
      if (!statusResponse.ok) continue;
      const status=await statusResponse.json() as {status?:string;result?:unknown};
      if (status.status==='completed' && status.result) return status.result;
      if (status.status==='failed' || status.status==='not_found') return null;
    }
  } catch {}
  return null;
}

function sleep(ms:number) {
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function alemClinicalFallback(symptoms:string) {
  if (!symptoms.trim()) return emptyResponse();
  const prompt=`Ты клинический AI-assistant для учебного MVP. Настоящий RAG-сервис сейчас не подключен, поэтому делай осторожный clinical reasoning по введенному тексту.

  const prompt = `Ты клинический AI-assistant. Сформируй осторожный дифференциально-диагностический ряд по тексту.
Правила:
- Supporting findings должны содержать подтверждающие слова пациента (patient_evidence).
- Не выдумывай источники протоколов.
- Качество confidence: "high" | "medium" | "low".

Симптомы:
${symptoms}

Верни JSON строго такого вида:
{"case_id":"alem-fallback","diagnoses":[{"rank":1,"diagnosis":"...","icd10_code":"...","confidence":"high|medium|low","why_this_diagnosis":"...","supporting_findings":[{"finding":"...","patient_evidence":"..."}],"missing_findings":["..."],"recommended_checks":["..."]}],"follow_up_questions":[{"question":"...","target_diagnoses":["..."],"rationale":"..."}]}`;
  return await callClinicalJson(prompt,{maxTokens:2600,timeoutMs:45000})??emptyResponse();
}

function emptyResponse(){
  return {case_id:'alem-fallback',diagnoses:[],follow_up_questions:[]};
}
