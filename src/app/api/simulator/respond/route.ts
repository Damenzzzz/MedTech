import {NextResponse} from 'next/server';
import {callClinicalText} from '@/lib/llm';

export async function POST(request:Request) {
  const {caseContext,caseTitle,publicBrief,hiddenContext,casePrompt,dialogue}=await request.json();
  const system=`Ты медицинский симулятор. Твоя единственная роль: играть пациента на русском языке.

Правила:
- Отвечай только словами пациента от первого лица.
- Ответ должен быть полностью на русском языке, даже если входные поля, JSON или вопрос содержат английские слова.
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
  return NextResponse.json({answer:answer??fallbackPatientAnswer({hiddenContext:hiddenContext??caseContext?.hiddenContext??casePrompt??'',dialogue})});
}

function fallbackPatientAnswer({hiddenContext,dialogue}:{hiddenContext:string;dialogue?:{speaker?:string;text?:string}[]}) {
  const question=String((dialogue??[]).filter(turn=>turn.speaker==='doctor').at(-1)?.text??'').toLowerCase();
  const sentences=String(hiddenContext).split(/(?<=[.!?])\s+|;\s+|\n+/).map(x=>x.trim()).filter(Boolean);
  const keywordGroups=[
    ['когда','начал','длитель','сколько','минут','час','день'],
    ['куда','отда','ирради','рук','челюст','спин'],
    ['температур','жар','озноб'],
    ['одыш','дыш','сатурац','spo2'],
    ['тошн','рвот','живот','аппетит'],
    ['давлен','пульс','сердц','грудин','боль'],
    ['моч','дизур','поясниц'],
    ['аллерг','лекар','инсулин','антибиот'],
    ['беремен','менстру','отеки','зрен','мушк'],
  ];
  const group=keywordGroups.find(words=>words.some(word=>question.includes(word)));
  const matched=group?sentences.find(sentence=>group.some(word=>sentence.toLowerCase().includes(word))):undefined;
  const answer=matched??sentences.find(sentence=>!/(диагноз|мкб|протокол|expected|unsafe|scoring)/i.test(sentence))??'Мне трудно объяснить, уточните, пожалуйста, что именно вас интересует.';
  return answer.replace(/^(пациент(ка)?\s*\d*\s*(лет|года)?\.?\s*)/i,'').trim();
}
