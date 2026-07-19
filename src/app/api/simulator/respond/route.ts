import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const {casePrompt,dialogue}=await request.json();
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({answer:'Сейчас мне сложно ответить, уточните вопрос.'});
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_SIM_MODEL??'gpt-5.5',messages:[{role:'system',content:'You play a realistic synthetic patient in Russian. Answer only as the patient. Reveal only facts asked by the doctor. Do not diagnose yourself. Keep answers concise.'},{role:'user',content:`Case facts:\n${casePrompt}\n\nDialogue:\n${JSON.stringify(dialogue, null, 2)}\n\nAnswer the last doctor question as the patient.`}],reasoning_effort:'low',max_completion_tokens:700}),cache:'no-store'});
  if (!response.ok) return NextResponse.json({answer:'Повторите, пожалуйста, вопрос.'});
  const data=await response.json();
  return NextResponse.json({answer:data.choices?.[0]?.message?.content??'Я не поняла вопрос.'});
}
