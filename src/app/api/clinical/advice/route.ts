import {NextResponse} from 'next/server';

export const maxDuration=300;

type RagSource={title?:string;protocol_id?:string;chunk_id?:string;section?:string;text?:string;excerpt?:string};
type RagDiagnosis={rank?:number;diagnosis?:string;icd10_code?:string;confidence?:string;why_this_diagnosis?:string;sources?:RagSource[]};
type RagResult={diagnoses?:RagDiagnosis[];sources?:RagSource[];case_id?:string};
type AdviceMessage={role:'clinician'|'assistant';content:string};
type RagDecision={need_rag:boolean;reason:string};

export async function POST(request:Request) {
  const body=await request.json() as {scenario?:string;role?:string;resources?:string;mode?:'chat'|'action';messages?:AdviceMessage[]};
  const scenario=String(body.scenario??'').trim();
  const role=String(body.role??'Медицинский работник').trim();
  const resources=String(body.resources??'').trim();
  if (!scenario) return NextResponse.json({error:'scenario is required'},{status:400});

  if (body.mode==='chat') {
    return NextResponse.json(await buildFastChat({scenario,role,resources,messages:body.messages??[]}));
  }

  const decision=await decideRagNeed({scenario,role,resources,messages:body.messages??[]});
  const rag=decision.need_rag?await getRagContext(scenario,resources):{status:'llm-direct-no-rag',result:null};
  const advice=await buildAdvice({scenario,role,resources,rag});
  return NextResponse.json({...advice,rag_decision:decision.reason});
}

async function decideRagNeed({scenario,role,resources,messages}:{scenario:string;role:string;resources:string;messages:AdviceMessage[]}):Promise<RagDecision> {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return {need_rag:true,reason:'OpenAI router unavailable, using RAG/fallback for safety.'};
  const history=messages.slice(-10).map(m=>`${m.role==='clinician'?'Медработник':'AI'}: ${m.content}`).join('\n');
  const prompt=`Decide whether this rural clinical assistant request needs slow official-protocol RAG before giving an action plan.

Return need_rag=true when:
- possible emergency, red flags, unstable vitals, pregnancy, child/elderly high risk;
- diagnosis, differential diagnosis, treatment, medication, contraindications, referral/evacuation, protocol-specific decision;
- clinician asks "what to do" for a real patient and harm is possible.

Return need_rag=false only when:
- low-risk general workflow/admin explanation;
- very light self-care/common-sense guidance with no medication/diagnostic commitment;
- the answer can be safely framed as general triage without protocol details.

Role: ${role}
Resources: ${resources || 'not specified'}
Scenario: ${scenario}
Chat:
${history || 'none'}

JSON only: {"need_rag":true|false,"reason":"short reason"}`;
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_CLINICAL_MODEL??'gpt-5.5',
        messages:[{role:'system',content:'Return valid JSON only.'},{role:'user',content:prompt}],
        response_format:{type:'json_object'},
        reasoning_effort:'low',
        max_completion_tokens:300,
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error('router_failed');
    const data=await response.json();
    const parsed=JSON.parse(data.choices?.[0]?.message?.content??'{}');
    return {need_rag:parsed.need_rag!==false,reason:String(parsed.reason??'LLM router decision')};
  } catch {
    return {need_rag:true,reason:'Router failed, using RAG/fallback for safety.'};
  }
}

async function buildFastChat({scenario,role,resources,messages}:{scenario:string;role:string;resources:string;messages:AdviceMessage[]}) {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      mode:'chat',
      safety_notice:'AI-ассистент помогает, но последнее решение принимает врач/ответственный медработник на месте.',
      reply:'Уточните витальные показатели, время начала симптомов, красные флаги и что доступно на месте. Если ситуация нестабильная, не ждите AI: действуйте по ABC и вызывайте эвакуацию.',
      questions:['Какие АД, пульс, SpO2, ЧДД и температура сейчас?','Когда начались симптомы?','Есть ли нарушение сознания, одышка, сильная боль, кровотечение или неврологический дефицит?'],
      need_rag:false,
      urgency_hint:'urgent',
    };
  }
  const history=messages.slice(-12).map(m=>`${m.role==='clinician'?'Медработник':'AI'}: ${m.content}`).join('\n');
  const prompt=`Ты быстрый клинический AI-ассистент для врача/медсестры в сельской местности.
Это режим короткого чата ДО тяжелого RAG-поиска. Не запускай RAG мысленно и не ссылайся на протоколы, если их нет в сообщении.

Правила:
- Последнее решение принимает врач/ответственный медработник.
- Если данных достаточно для безопасного общего ответа, отвечай сразу.
- Если данных не хватает, задай 1-3 самых важных уточняющих вопроса. Не растягивай диалог.
- Если есть красные флаги, не жди уточнений: скажи действовать по ABC, мониторинг, вызов скорой/эвакуация.
- Не назначай точные дозировки без протокола. Для конкретного плана лечения предложи нажать "Дать действия", чтобы свериться с RAG.
- Если нужна точная протокольная тактика, выставь need_rag=true.
- Не выдумывай факты пациента.

Кто спрашивает: ${role}
Ресурсы: ${resources || 'не указаны'}
Первичная ситуация: ${scenario}

История чата:
${history || 'Пока нет.'}

Верни JSON:
{"mode":"chat","safety_notice":"...","reply":"короткий ответ","questions":["..."],"need_rag":true|false,"urgency_hint":"emergency|urgent|semi-urgent|routine"}`;
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_CLINICAL_MODEL??'gpt-5.5',
        messages:[{role:'system',content:'Return valid JSON only. Keep answers short and clinically safe.'},{role:'user',content:prompt}],
        response_format:{type:'json_object'},
        reasoning_effort:'low',
        max_completion_tokens:1200,
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(16000),
    });
    if (!response.ok) throw new Error('openai_failed');
    const data=await response.json();
    const parsed=JSON.parse(data.choices?.[0]?.message?.content??'{}');
    return {
      mode:'chat',
      safety_notice:parsed.safety_notice??'AI-ассистент помогает, но последнее решение принимает врач/ответственный медработник на месте.',
      reply:parsed.reply??'Уточните витальные показатели и красные флаги. Для протокольного плана нажмите "Дать действия".',
      questions:Array.isArray(parsed.questions)?parsed.questions.slice(0,4):[],
      need_rag:Boolean(parsed.need_rag),
      urgency_hint:parsed.urgency_hint??'urgent',
    };
  } catch {
    return {
      mode:'chat',
      safety_notice:'AI-ассистент помогает, но последнее решение принимает врач/ответственный медработник на месте.',
      reply:'Если пациент нестабилен, действуйте по ABC, мониторируйте витальные показатели и организуйте эвакуацию. Для точной протокольной тактики нажмите "Дать действия".',
      questions:['Какие витальные показатели сейчас?','Когда начались симптомы?','Есть ли красные флаги?'],
      need_rag:true,
      urgency_hint:'urgent',
    };
  }
}

async function getRagContext(scenario:string,resources:string) {
  const base=process.env.RAG_SERVICE_URL;
  if (!base) return {status:'rag-unavailable',result:null};
  const symptoms=`${scenario}\n\nУсловия помощи: ${resources}`;
  const viaJob=await getRagContextViaJob(base, symptoms);
  if (viaJob.status !== "rag-job-unavailable") return viaJob;
  if (!isLocalRag(base)) return {status:'rag-limited',result:null};
  try {
    const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({symptoms}),
      cache:'no-store',
      signal:AbortSignal.timeout(180000),
    });
    if (!response.ok) return {status:`rag-error-${response.status}`,result:null};
    return {status:'rag-ready',result:await response.json() as RagResult};
  } catch {
    return {status:'rag-timeout-or-unavailable',result:null};
  }
}

function isLocalRag(base:string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(base);
}

async function getRagContextViaJob(base:string,symptoms:string) {
  const root=base.replace(/\/$/,'');
  try {
    const start=await fetch(`${root}/api/diagnose-jobs`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({symptoms}),
      cache:'no-store',
      signal:AbortSignal.timeout(8000),
    });
    if (!start.ok) return {status:'rag-job-unavailable',result:null};
    const started=await start.json() as {job_id?:string;status?:string;result?:RagResult};
    if (started.result) return {status:'rag-ready',result:started.result};
    if (!started.job_id) return {status:'rag-job-unavailable',result:null};

    const deadline=Date.now()+185000;
    while (Date.now()<deadline) {
      await sleep(3500);
      const statusResponse=await fetch(`${root}/api/diagnose-jobs/${started.job_id}`,{
        cache:'no-store',
        signal:AbortSignal.timeout(8000),
      });
      if (!statusResponse.ok) continue;
      const status=await statusResponse.json() as {status?:string;result?:RagResult;warning?:string};
      if (status.status==='completed' && status.result) {
        return {status:status.warning?'rag-ready-with-warning':'rag-ready',result:status.result};
      }
      if (status.status==='failed' || status.status==='not_found') {
        return {status:`rag-job-${status.status}`,result:null};
      }
    }
    return {status:'rag-job-timeout',result:null};
  } catch {
    return {status:'rag-job-unavailable',result:null};
  }
}

function sleep(ms:number) {
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function buildAdvice({scenario,role,resources,rag}:{scenario:string;role:string;resources:string;rag:{status:string;result:RagResult|null}}) {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackAdvice(scenario,rag);
  const sources=collectSources(rag.result);
  const protocolContext=JSON.stringify({
    rag_status:rag.status,
    candidate_diagnoses:(rag.result?.diagnoses??[]).slice(0,5),
    sources:sources.slice(0,6),
  },null,2).slice(0,16000);
  const prompt=`Ты клинический AI-ассистент для врача/медсестры в сельской местности Казахстана.
Задача: помочь медработнику быстро сориентироваться, что делать сейчас.
Если rag_status = "rag-ready", опирайся на RAG-контекст официальных клинических протоколов.
Если rag_status НЕ "rag-ready", RAG не запускался или не успел: дай общий безопасный план, не утверждай, что сверялся с протоколами, и при риске советуй очную маршрутизацию/локальный протокол.

Критически важные правила:
- Ты НЕ заменяешь врача. Последнее решение принимает врач или ответственный медработник на месте.
- Не выдумывай факты пациента. Любое действие должно быть привязано к введенной ситуации или к протоколу.
- Критерии протокола, которых нет в ситуации, указывай как "что уточнить/измерить", а не как факт пациента.
- Если есть признаки жизнеугрожающего состояния, сначала дай ABC/triage/маршрутизацию, потом дифференциальные риски.
- Не указывай точные дозировки лекарств, если они не следуют из локального протокола в RAG-контексте. Пиши "по протоколу/локальному стандарту" при неопределенности.
- Учитывай ограниченные ресурсы: ФАП, сельская амбулатория, ожидание скорой, нет профильного специалиста.
- Ответ должен быть практичным, коротким и безопасным.

Кто спрашивает: ${role}
Доступные ресурсы:
${resources || 'Не указаны'}

Клиническая ситуация:
${scenario}

RAG-контекст:
${protocolContext}

Верни валидный JSON строго такого вида:
{
  "safety_notice":"AI-ассистент помогает по протоколам, но последнее решение принимает врач/ответственный медработник на месте.",
  "urgency":"emergency|urgent|semi-urgent|routine",
  "most_likely_risks":["..."],
  "do_now":[{"step":"...","why":"..."}],
  "ask_or_measure_next":["..."],
  "treatment_options":[{"option":"...","when":"...","avoid_if":"..."}],
  "referral":{"decision":"...","reason":"..."},
  "what_not_to_do":["..."],
  "sources":[{"title":"...","protocol_id":"...","excerpt":"..."}],
  "rag_status":"${rag.status}"
}`;
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_CLINICAL_MODEL??'gpt-5.5',
        messages:[{role:'system',content:'Return valid JSON only. Be conservative and clinically safe.'},{role:'user',content:prompt}],
        response_format:{type:'json_object'},
        reasoning_effort:'low',
        max_completion_tokens:2600,
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(45000),
    });
    if (!response.ok) return fallbackAdvice(scenario,rag);
    const data=await response.json();
    const parsed=JSON.parse(data.choices?.[0]?.message?.content??'{}');
    return {
      safety_notice:parsed.safety_notice??'AI-ассистент помогает по протоколам, но последнее решение принимает врач/ответственный медработник на месте.',
      urgency:parsed.urgency??'urgent',
      most_likely_risks:Array.isArray(parsed.most_likely_risks)?parsed.most_likely_risks:[],
      do_now:Array.isArray(parsed.do_now)?parsed.do_now:[],
      ask_or_measure_next:Array.isArray(parsed.ask_or_measure_next)?parsed.ask_or_measure_next:[],
      treatment_options:Array.isArray(parsed.treatment_options)?parsed.treatment_options:[],
      referral:parsed.referral??{},
      what_not_to_do:Array.isArray(parsed.what_not_to_do)?parsed.what_not_to_do:[],
      sources:Array.isArray(parsed.sources)&&parsed.sources.length?parsed.sources:sources.slice(0,4).map(source=>({title:source.title,protocol_id:source.protocol_id,excerpt:excerpt(source)})),
      rag_status:rag.status,
    };
  } catch {
    return fallbackAdvice(scenario,rag);
  }
}

function collectSources(result:RagResult|null) {
  const values=[...(result?.sources??[]),...((result?.diagnoses??[]).flatMap(d=>d.sources??[]))];
  const seen=new Set<string>();
  return values.filter(source=>{
    const key=source.chunk_id??source.protocol_id??source.title??source.text?.slice(0,80);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function excerpt(source:RagSource) {
  return String(source.excerpt??source.text??'').replace(/\s+/g,' ').slice(0,360);
}

function fallbackAdvice(scenario:string,rag:{status:string;result:RagResult|null}) {
  const diagnoses=(rag.result?.diagnoses??[]).slice(0,3).map(d=>[d.icd10_code,d.diagnosis].filter(Boolean).join(' ')).filter(Boolean);
  return {
    safety_notice:'AI-ассистент помогает по протоколам, но последнее решение принимает врач/ответственный медработник на месте.',
    urgency:/боль за грудин|одыш|SpO2\s*(8|9[0-2])|АД\s*8\d|потер|созн|судорог|кровотеч/i.test(scenario)?'emergency':'urgent',
    most_likely_risks:diagnoses.length?diagnoses:['Жизнеугрожающее состояние нужно исключить по ABC и витальным показателям'],
    do_now:[
      {step:'Оценить ABC, сознание, дыхание, пульс, АД, SpO2 и температуру',why:'Это определяет срочность и безопасность дальнейших действий.'},
      {step:'Если состояние нестабильное, вызвать скорую/маршрутизацию и начать помощь по локальному протоколу',why:'В сельских условиях нельзя ждать профильного специалиста при красных флагах.'},
      {step:'Документировать исходные жалобы, время начала, витальные показатели и выполненные действия',why:'Это нужно для передачи пациента и контроля динамики.'},
    ],
    ask_or_measure_next:['Время начала симптомов','АД, пульс, SpO2, ЧДД, температура','Красные флаги: нарушение сознания, одышка, кровотечение, сильная боль, неврологический дефицит','Аллергии, беременность, текущие лекарства и противопоказания'],
    treatment_options:[
      {option:'Поддерживающая помощь и мониторинг',when:'Всегда при ожидании эвакуации или уточнении диагноза',avoid_if:'Не заменяет специфическое лечение при красных флагах'},
      {option:'Кислород по показаниям',when:'При гипоксемии или дыхательной недостаточности',avoid_if:'Ориентироваться на локальный протокол и целевые значения'},
      {option:'Специфическое лекарство только по протоколу',when:'Когда показания и противопоказания проверены',avoid_if:'Аллергия, противопоказания, неясная ситуация без контроля врача'},
    ],
    referral:{decision:'При красных флагах организовать срочную маршрутизацию в стационар/к профильному специалисту.',reason:'RAG/GPT fallback не должен задерживать очную помощь.'},
    what_not_to_do:['Не откладывать эвакуацию при нестабильных витальных показателях','Не превращать критерии протокола в факты пациента без подтверждения','Не назначать потенциально опасные препараты без проверки противопоказаний'],
    sources:collectSources(rag.result).slice(0,4).map(source=>({title:source.title,protocol_id:source.protocol_id,excerpt:excerpt(source)})),
    rag_status:rag.status,
  };
}
