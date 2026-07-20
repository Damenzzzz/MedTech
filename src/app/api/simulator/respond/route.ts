import {NextResponse} from 'next/server';
import {callClinicalText} from '@/lib/llm';

export async function POST(request:Request) {
  const {caseContext,caseTitle,publicBrief,hiddenContext,casePrompt,dialogue}=await request.json();
  const system=`Ты медицинский симулятор. Твоя единственная роль: играть пациента на русском языке.

Правила:
- Отвечай только словами пациента от первого лица.
- Не говори диагноз, МКБ, протокол, критерии или план лечения, если пациент не может это знать.
- Не раскрывай весь скрытый контекст сразу. Сообщай только то, о чем врач прямо спросил.
- Если вопрос непонятный, попроси уточнить как пациент.
- Сохраняй характер, тревогу, возраст, историю и последовательность фактов на протяжении всего диалога.
- Можно отвечать живо и естественно, но без медицинского рассуждения ассистента.
- Если врач задает закрытый вопрос, отвечай коротко. Если открытый, дай 1-3 предложения.
- Это учебный синтетический случай, не реальный пациент.`;
  const prompt=`Структура сценария:
${JSON.stringify(caseContext??{}, null, 2)}

Название сценария: ${caseContext?.title??caseTitle??'custom'}

Открытая вводная для студента:
${publicBrief??''}

Скрытый контекст пациента, известный только симулятору:
${hiddenContext??caseContext?.hiddenContext??casePrompt??''}

Текущий диалог:
${JSON.stringify(dialogue, null, 2)}

Ответь на последний вопрос врача строго как пациент.`;
  const answer=await callClinicalText(prompt,{system,maxTokens:700,timeoutMs:30000});
  return NextResponse.json({answer:answer??'Повторите, пожалуйста, вопрос.'});
}
