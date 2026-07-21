type JsonValue=Record<string,unknown>;

const RUSSIAN_TEXT_RULE='Отвечай строго на русском языке. Все человекочитаемые фразы, объяснения, вопросы, предупреждения и значения строк должны быть на русском. Не используй английский язык, кроме технических кодов, названий API, JSON-ключей, МКБ/ICD-кодов и общепринятых медицинских сокращений.';
const JSON_RULE='Верни только валидный JSON. JSON-ключи оставь строго как запрошено, но все текстовые значения внутри JSON пиши строго на русском языке.';
const TEXT_RULE='Отвечай только на русском языке.';

export async function callClinicalJson<T extends JsonValue>(prompt:string, options?:{system?:string;maxTokens?:number;timeoutMs?:number}):Promise<T|null> {
  const system=withRussianRule(options?.system??JSON_RULE, true);
  const gemini=await callGemini(prompt,{...options,system,json:true});
  const geminiJson=gemini ? parseJsonObject<T>(gemini) : null;
  if (geminiJson) return geminiJson;

  const apiKey=process.env.ALEM_API_KEY;
  if (!apiKey) return null;
  try {
    const response=await fetch(`${alemBaseUrl()}/chat/completions`,{
      method:'POST',
      headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({
        model:process.env.ALEM_CHAT_MODEL??'alemllm',
        messages:[
          {role:'system',content:system},
          {role:'user',content:withRussianUserInstruction(prompt,true)},
        ],
        temperature:0.1,
        max_tokens:options?.maxTokens??1600,
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(options?.timeoutMs??30000),
    });
    if (!response.ok) return null;
    const data=await response.json();
    return parseJsonObject<T>(String(data.choices?.[0]?.message?.content??''));
  } catch {
    return null;
  }
}

export async function callClinicalText(prompt:string, options?:{system?:string;maxTokens?:number;timeoutMs?:number}):Promise<string|null> {
  const system=withRussianRule(options?.system??TEXT_RULE, false);
  const gemini=await callGemini(prompt,{...options,system,json:false});
  if (gemini) return gemini;

  const apiKey=process.env.ALEM_API_KEY;
  if (!apiKey) return null;
  try {
    const response=await fetch(`${alemBaseUrl()}/chat/completions`,{
      method:'POST',
      headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({
        model:process.env.ALEM_CHAT_MODEL??'alemllm',
        messages:[
          {role:'system',content:system},
          {role:'user',content:withRussianUserInstruction(prompt,false)},
        ],
        temperature:0.2,
        max_tokens:options?.maxTokens??900,
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(options?.timeoutMs??30000),
    });
    if (!response.ok) return null;
    const data=await response.json();
    return String(data.choices?.[0]?.message?.content??'').trim()||null;
  } catch {
    return null;
  }
}

async function callGemini(prompt:string, options?:{system?:string;maxTokens?:number;timeoutMs?:number;json?:boolean}) {
  const apiKey=process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const model=process.env.GEMINI_MODEL??'gemini-2.5-flash';
    const response=await fetch(`${geminiBaseUrl()}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:options?.system??withRussianRule(options?.json?JSON_RULE:TEXT_RULE, Boolean(options?.json))}]},
        contents:[{role:'user',parts:[{text:withRussianUserInstruction(prompt, Boolean(options?.json))}]}],
        generationConfig:{
          temperature:options?.json?0.1:0.2,
          maxOutputTokens:options?.maxTokens??1200,
          responseMimeType:options?.json?'application/json':'text/plain',
        },
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(options?.timeoutMs??30000),
    });
    if (!response.ok) return null;
    const data=await response.json();
    const parts=data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    return parts.map((part:{text?:string})=>part.text??'').join('').trim()||null;
  } catch {
    return null;
  }
}

function withRussianRule(system:string, json:boolean) {
  const rule=json?`${JSON_RULE}\n${RUSSIAN_TEXT_RULE}`:`${TEXT_RULE}\n${RUSSIAN_TEXT_RULE}`;
  return `${rule}\n\n${system}`.trim();
}

function withRussianUserInstruction(prompt:string, json:boolean) {
  const instruction=json
    ? 'Важно: ответ должен быть строго валидным JSON; все текстовые значения внутри JSON должны быть на русском языке.'
    : 'Важно: ответ должен быть полностью на русском языке.';
  return `${prompt}\n\n${instruction}`;
}

function geminiBaseUrl() {
  return (process.env.GEMINI_BASE_URL??'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'');
}

function alemBaseUrl() {
  return (process.env.ALEM_BASE_URL??'https://llm.alem.ai/v1').replace(/\/$/,'');
}

function parseJsonObject<T>(content:string):T|null {
  const cleaned=content.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const direct=tryParse<T>(cleaned);
  if (direct) return direct;
  const start=cleaned.indexOf('{');
  const end=cleaned.lastIndexOf('}');
  if (start>=0 && end>start) return tryParse<T>(cleaned.slice(start,end+1));
  return null;
}

function tryParse<T>(value:string):T|null {
  try {
    const parsed=JSON.parse(value);
    return parsed && typeof parsed==='object' ? parsed as T : null;
  } catch {
    return null;
  }
}
