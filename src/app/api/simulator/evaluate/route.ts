import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const body=await request.json();
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({feedback:localEvaluate(body)});
  const prompt=`Ты оцениваешь учебный клинический симулятор.

Сценарий:
${JSON.stringify(body.caseContext, null, 2)}

Открытая вводная:
${body.publicBrief??''}

Скрытый контекст пациента:
${body.hiddenContext??''}

Диалог студента с пациентом:
${JSON.stringify(body.dialogue??[], null, 2)}

Выбранные диагнозы студентом:
${JSON.stringify(body.selectedDiagnoses??[], null, 2)}

Выбранная тактика/лечение:
${JSON.stringify(body.selectedPlan??[], null, 2)}

Оцени:
1. Какие важные вопросы студент задал хорошо.
2. Какие ключевые вопросы/симптомы/красные флаги пропустил.
3. Верно ли выбрал диагноз.
4. Верна ли тактика лечения/маршрутизация.
5. Какие опасные ошибки есть.

Верни короткий feedback на русском, 5-8 строк, без markdown-таблиц.`;
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_SIM_MODEL??'gpt-5.5',messages:[{role:'system',content:'You are a strict but helpful clinical educator. Return concise Russian feedback.'},{role:'user',content:prompt}],reasoning_effort:'low',max_completion_tokens:1200}),cache:'no-store'});
    if (!response.ok) return NextResponse.json({feedback:localEvaluate(body)});
    const data=await response.json();
    return NextResponse.json({feedback:data.choices?.[0]?.message?.content??localEvaluate(body)});
  } catch {
    return NextResponse.json({feedback:localEvaluate(body)});
  }
}

function localEvaluate(body:{caseContext?:{expectedDiagnoses?:string[];expectedPlan?:string[];unsafePlan?:string[];diagnosis?:string};selectedDiagnoses?:string[];selectedPlan?:string[]}) {
  const expectedDx=body.caseContext?.expectedDiagnoses??[];
  const expectedPlan=body.caseContext?.expectedPlan??[];
  const unsafe=body.caseContext?.unsafePlan??[];
  const selectedDx=body.selectedDiagnoses??[];
  const selectedPlan=body.selectedPlan??[];
  const missedDx=expectedDx.filter(item=>!selectedDx.some(value=>sameCode(value,item)));
  const missedPlan=expectedPlan.filter(item=>!selectedPlan.includes(item)).slice(0,4);
  const dangerous=selectedPlan.filter(item=>unsafe.includes(item));
  return [
    missedDx.length?`Диагноз требует доработки: не выбран ${missedDx.join(', ')}.`:'Диагноз выбран близко к эталону.',
    missedPlan.length?`В плане не хватает: ${missedPlan.join('; ')}.`:'План в целом покрывает ключевую тактику.',
    dangerous.length?`Опасные решения: ${dangerous.join('; ')}.`:'Явных опасных решений в выбранном плане нет.',
    `Эталон: ${body.caseContext?.diagnosis??'не задан'}.`,
  ].join('\n');
}

function sameCode(a:string,b:string) {
  const left=a.split(' ')[0].toLowerCase();
  const right=b.split(' ')[0].toLowerCase();
  return left===right || a.toLowerCase().includes(right) || b.toLowerCase().includes(left);
}
