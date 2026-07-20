import {NextResponse} from 'next/server';
import {getDemoRagFallback} from '@/lib/demo-rag';

export const maxDuration=300;

export async function POST(request:Request) {
  const body=await request.json();
  const demo=getDemoRagFallback(String(body.symptoms??''));
  if (demo) return NextResponse.json(demo);

  const base=process.env.RAG_SERVICE_URL;
  if (base) {
    try {
      const jobResult=await diagnoseViaJob(base, body);
      if (jobResult) return NextResponse.json(jobResult);
      const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(180000)});
      if (response.ok) return NextResponse.json(await response.json());
    } catch {}
  }
  return NextResponse.json(await openAiClinicalFallback(String(body.symptoms??'')));
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

async function openAiClinicalFallback(symptoms:string) {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey || !symptoms.trim()) return emptyResponse();
  const prompt=`Ты клинический AI-assistant для учебного MVP. Настоящий RAG-сервис сейчас не подключен, поэтому делай осторожный clinical reasoning по введенному тексту.

Строгие правила:
- Не выдумывай факты пациента. Supporting findings должны иметь patient_evidence из входного текста.
- Критерии, которых нет во входном тексте, помещай только в missing_findings/recommended_checks.
- Верни 3 разных возможных диагноза, если это клинически возможно.
- Это не финальный диагноз и не замена врача.

Симптомы:
${symptoms}

Верни JSON строго такого вида:
{"case_id":"openai-fallback","diagnoses":[{"rank":1,"diagnosis":"...","icd10_code":"...","confidence":"high|medium|low","why_this_diagnosis":"...","supporting_findings":[{"finding":"...","patient_evidence":"..."}],"missing_findings":["..."],"recommended_checks":["..."]}],"follow_up_questions":[{"question":"...","target_diagnoses":["..."],"rationale":"..."}]}`;
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_CLINICAL_MODEL??'gpt-5.5',messages:[{role:'system',content:'Return valid JSON only.'},{role:'user',content:prompt}],response_format:{type:'json_object'},reasoning_effort:'low',max_completion_tokens:2600}),cache:'no-store'});
    if (!response.ok) return emptyResponse();
    const data=await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content??'{}');
  } catch {
    return emptyResponse();
  }
}

function emptyResponse(){
  return {case_id:'openai-fallback',diagnoses:[],follow_up_questions:[]};
}
