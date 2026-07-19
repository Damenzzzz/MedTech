import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const body=await request.json();
  const base=process.env.RAG_SERVICE_URL;
  if (base) {
    try {
      const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      if (response.ok) return NextResponse.json(await response.json());
    } catch {}
  }
  return NextResponse.json(await openAiClinicalFallback(String(body.symptoms??'')));
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
