import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callClinicalJson } from '@/lib/ai/text-llm.server';
import { getCurrentSession } from '@/lib/auth/session-role.server';
import { hasPatientEmergencyRedFlags } from '@/lib/clinical/red-flags';
import { collectRagSources, fetchRagContext } from '@/lib/rag/rag-job.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const InputSchema = z.object({
  symptoms: z.string().trim().min(3, 'Опишите, что вас беспокоит').max(4000),
  locale: z.enum(['ru', 'kk', 'en']).default('ru'),
});

const DISCLAIMER: Record<string, string> = {
  ru: 'Это не диагноз и не назначение. Помощник готовит вас к приёму. Точный диагноз ставит только врач.',
  kk: 'Бұл диагноз да, тағайындау да емес. Көмекші сізді қабылдауға дайындайды. Нақты диагнозды тек дәрігер қояды.',
  en: 'This is not a diagnosis or a prescription. The assistant only helps you prepare for your visit. Only a doctor can diagnose you.',
};

const LANGUAGE_NAME: Record<string, string> = { ru: 'русском', kk: 'казахском', en: 'английском' };

type AssistantResult = {
  disclaimer: string;
  urgency: 'emergency' | 'urgent' | 'routine';
  possible_directions: string[];
  prepare: string[];
  measurements_to_note: string[];
  questions_for_doctor: string[];
  what_to_tell_doctor: string[];
  red_flags_when_urgent: string[];
  rag_status: string;
  sources_count: number;
  elapsed_ms: number;
};

export async function POST(request: Request) {
  // Same gate as the portal page: a signed-in patient (their own data) or a doctor.
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = InputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { symptoms, locale } = parsed.data;
  const disclaimer = DISCLAIMER[locale] ?? DISCLAIMER.ru;

  try {
    // 1. Red flags short-circuit the slow RAG round trip — nobody should wait
    //    60s for a job to finish when the answer is "call 103 now".
    if (hasPatientEmergencyRedFlags(symptoms)) {
      return NextResponse.json(emergencyResult(disclaimer, locale));
    }

    // 2. Protocol context through the shared job flow.
    const rag = await fetchRagContext({ symptoms }, 'patient-assistant');
    const sources = collectRagSources(rag.result).slice(0, 6);

    // 3. Final answer from AlemLLM.
    const result = await buildAssistantAnswer({ symptoms, locale, ragStatus: rag.status, sources });

    return NextResponse.json({
      ...(result ?? fallbackResult(disclaimer, locale)),
      disclaimer,
      rag_status: rag.status,
      sources_count: sources.length,
      elapsed_ms: rag.elapsedMs,
    } satisfies AssistantResult);
  } catch (error) {
    console.error('[patient assistant error]', error);
    return NextResponse.json(
      { error: 'assistant_failed', message: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}

async function buildAssistantAnswer({
  symptoms,
  locale,
  ragStatus,
  sources,
}: {
  symptoms: string;
  locale: string;
  ragStatus: string;
  sources: unknown[];
}) {
  const protocolContext = JSON.stringify({ rag_status: ragStatus, sources }, null, 2).slice(0, 12000);

  const prompt = `Ты бережный помощник, который готовит ПАЦИЕНТА (не медработника) к приёму у врача.
Пациент описал, что его беспокоит. Твоя задача — помочь ему прийти к врачу подготовленным.

СТРОГИЕ ЗАПРЕТЫ:
- НЕ ставь диагноз и не пиши категоричных утверждений вида "у вас X". Используй формулировки "врач будет проверять…", "врач может обратить внимание на…".
- НЕ называй конкретные дозы и НЕ называй рецептурные препараты.
- НЕ пугай. Тон спокойный, поддерживающий, понятный человеку без медицинского образования.
- НЕ используй медицинский жаргон без пояснения простыми словами.
- НЕ выдумывай факты о пациенте, которых нет в его описании.
- Пиши СТРОГО на ${LANGUAGE_NAME[locale] ?? 'русском'} языке.

Если rag_status = "rag-ready", можешь опираться на контекст официальных клинических протоколов ниже.
Если нет — дай общие безопасные подсказки и НЕ утверждай, что сверялся с протоколами.

Что беспокоит пациента:
${symptoms}

Контекст протоколов:
${protocolContext}

Верни ТОЛЬКО валидный JSON строго такого вида:
{
  "urgency": "urgent|routine",
  "possible_directions": ["осторожно: на что врач обратит внимание, 3-5 пунктов, без категоричного диагноза"],
  "prepare": ["что взять и вспомнить: прошлые анализы, список лекарств, аллергии, хронология симптомов"],
  "measurements_to_note": ["что измерить и записать до приёма: температура, давление, когда началось, что усиливает и что облегчает"],
  "questions_for_doctor": ["5-7 конкретных грамотных вопросов, которые стоит задать врачу"],
  "what_to_tell_doctor": ["как чётко описать жалобу: начало, характер, длительность, сопутствующее"],
  "red_flags_when_urgent": ["при каких признаках не ждать планового приёма и обратиться срочно"]
}`;

  const parsed = await callClinicalJson<{
    urgency?: string;
    possible_directions?: string[];
    prepare?: string[];
    measurements_to_note?: string[];
    questions_for_doctor?: string[];
    what_to_tell_doctor?: string[];
    red_flags_when_urgent?: string[];
  }>(prompt, {
    system:
      'Верни только валидный JSON. Ты говоришь с пациентом, а не с врачом: просто, бережно, без диагнозов, без доз и без названий рецептурных лекарств.',
    maxTokens: 2200,
    timeoutMs: 45000,
  });

  if (!parsed) return null;

  const list = (value: unknown, max = 8) =>
    Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, max) : [];

  return {
    urgency: parsed.urgency === 'urgent' ? ('urgent' as const) : ('routine' as const),
    possible_directions: list(parsed.possible_directions, 5),
    prepare: list(parsed.prepare),
    measurements_to_note: list(parsed.measurements_to_note),
    questions_for_doctor: list(parsed.questions_for_doctor, 8),
    what_to_tell_doctor: list(parsed.what_to_tell_doctor),
    red_flags_when_urgent: list(parsed.red_flags_when_urgent),
  };
}

function emergencyResult(disclaimer: string, locale: string): AssistantResult {
  const byLocale = {
    ru: {
      directions: ['Ваше описание содержит признаки, при которых нельзя ждать планового приёма.'],
      prepare: ['Позвоните 103 прямо сейчас или обратитесь в ближайший приёмный покой.', 'Не оставайтесь одни, попросите кого-то быть рядом.', 'Приготовьте документ, список лекарств и известные аллергии.'],
      measure: ['Запишите время начала симптомов.', 'Если возможно — измерьте давление, пульс и температуру.'],
      questions: ['Что делать прямо сейчас до приезда скорой?', 'Можно ли принимать мои обычные лекарства?', 'В какое отделение меня повезут?'],
      tell: ['Скажите диспетчеру 103 коротко: что случилось, когда началось, что беспокоит сильнее всего.', 'Назовите свой точный адрес.'],
      flags: ['Усиление боли, потеря сознания, нарастающая одышка — сообщите об этом сразу.'],
    },
    kk: {
      directions: ['Сіздің сипаттамаңызда жоспарлы қабылдауды күтуге болмайтын белгілер бар.'],
      prepare: ['Дәл қазір 103 нөміріне қоңырау шалыңыз немесе жақын қабылдау бөліміне барыңыз.', 'Жалғыз қалмаңыз, біреуден жаныңызда болуын өтініңіз.', 'Құжатты, дәрілер тізімін және белгілі аллергияларды дайындаңыз.'],
      measure: ['Симптомдардың басталу уақытын жазып алыңыз.', 'Мүмкін болса — қысымды, тамырды және температураны өлшеңіз.'],
      questions: ['Жедел жәрдем келгенге дейін не істеу керек?', 'Әдеттегі дәрілерімді қабылдауға бола ма?', 'Мені қай бөлімге апарады?'],
      tell: ['103 диспетчеріне қысқаша айтыңыз: не болды, қашан басталды, ең қатты не мазалайды.', 'Нақты мекенжайыңызды атаңыз.'],
      flags: ['Ауырсынудың күшеюі, есінен тану, ентігудің артуы — бұл туралы бірден хабарлаңыз.'],
    },
    en: {
      directions: ['Your description contains signs that should not wait for a scheduled visit.'],
      prepare: ['Call 103 now or go to the nearest emergency department.', 'Do not stay alone — ask someone to be with you.', 'Have your ID, medication list and known allergies ready.'],
      measure: ['Write down when the symptoms started.', 'If possible, measure blood pressure, pulse and temperature.'],
      questions: ['What should I do right now before the ambulance arrives?', 'Can I take my usual medication?', 'Which department will I be taken to?'],
      tell: ['Tell the 103 dispatcher briefly: what happened, when it started, what bothers you most.', 'Give your exact address.'],
      flags: ['Worsening pain, loss of consciousness or increasing breathlessness — report it immediately.'],
    },
  };

  const copy = byLocale[locale as keyof typeof byLocale] ?? byLocale.ru;

  return {
    disclaimer,
    urgency: 'emergency',
    possible_directions: copy.directions,
    prepare: copy.prepare,
    measurements_to_note: copy.measure,
    questions_for_doctor: copy.questions,
    what_to_tell_doctor: copy.tell,
    red_flags_when_urgent: copy.flags,
    rag_status: 'red-flag-shortcut',
    sources_count: 0,
    elapsed_ms: 0,
  };
}

function fallbackResult(disclaimer: string, locale: string) {
  const byLocale = {
    ru: {
      directions: ['Помощник не смог подготовить разбор. Опишите жалобу врачу своими словами — этого уже достаточно для начала приёма.'],
      prepare: ['Список принимаемых лекарств.', 'Прошлые анализы и выписки.', 'Известные аллергии.', 'Когда начались симптомы.'],
      measure: ['Температура.', 'Давление и пульс, если есть тонометр.', 'Что усиливает и что облегчает симптом.'],
      questions: ['Что может быть причиной моего состояния?', 'Какие обследования нужны и зачем?', 'Что мне делать, если станет хуже?', 'Когда прийти на повторный приём?'],
      tell: ['Когда началось и как менялось со временем.', 'Что именно беспокоит сильнее всего.', 'Что вы уже пробовали и помогло ли это.'],
      flags: ['Резкое ухудшение, сильная боль, одышка, потеря сознания — обращайтесь срочно, не ждите приёма.'],
    },
    kk: {
      directions: ['Көмекші талдау дайындай алмады. Шағымыңызды дәрігерге өз сөзіңізбен айтыңыз.'],
      prepare: ['Қабылдап жүрген дәрілер тізімі.', 'Бұрынғы талдаулар мен үзінділер.', 'Белгілі аллергиялар.', 'Симптомдар қашан басталды.'],
      measure: ['Температура.', 'Тонометр болса — қысым және тамыр.', 'Симптомды не күшейтеді, не жеңілдетеді.'],
      questions: ['Менің жағдайымның себебі не болуы мүмкін?', 'Қандай тексерулер қажет және не үшін?', 'Нашарлап кетсе не істеймін?', 'Қайта қабылдауға қашан келу керек?'],
      tell: ['Қашан басталды және уақыт өте қалай өзгерді.', 'Ең қатты не мазалайды.', 'Не қолданып көрдіңіз және көмектесті ме.'],
      flags: ['Күрт нашарлау, қатты ауырсыну, ентігу, есінен тану — қабылдауды күтпей, шұғыл жүгініңіз.'],
    },
    en: {
      directions: ['The assistant could not prepare a breakdown. Describe your complaint to the doctor in your own words.'],
      prepare: ['List of medication you take.', 'Previous test results and discharge notes.', 'Known allergies.', 'When the symptoms started.'],
      measure: ['Temperature.', 'Blood pressure and pulse if you have a monitor.', 'What makes it worse and what relieves it.'],
      questions: ['What could be causing my condition?', 'Which tests do I need and why?', 'What should I do if it gets worse?', 'When should I come back?'],
      tell: ['When it started and how it changed over time.', 'What bothers you the most.', 'What you already tried and whether it helped.'],
      flags: ['Sudden deterioration, severe pain, breathlessness or fainting — seek help immediately, do not wait.'],
    },
  };

  const copy = byLocale[locale as keyof typeof byLocale] ?? byLocale.ru;

  return {
    disclaimer,
    urgency: 'routine' as const,
    possible_directions: copy.directions,
    prepare: copy.prepare,
    measurements_to_note: copy.measure,
    questions_for_doctor: copy.questions,
    what_to_tell_doctor: copy.tell,
    red_flags_when_urgent: copy.flags,
  };
}
