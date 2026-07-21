import 'server-only';
import {
  DiagnoseResponse,
  DiagnoseResponseSchema,
  DiagnosisItem,
  ProtocolSource,
} from '@/domain/schemas';
import { getActiveLlmProvider } from '@/lib/ai/text-llm.server';
import { callClinicalJson } from '@/lib/ai/text-llm.server';

export function normalizeDiagnosisItem(raw: Record<string, unknown>, index: number, availableSourceIds: Set<string>): DiagnosisItem {
  const rank = typeof raw.rank === 'number' ? raw.rank : index + 1;
  const diagnosis = String(raw.diagnosis ?? 'Неуточнённое состояние').trim();
  const icd10Code = String(raw.icd10_code ?? 'R69').trim();

  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low') {
    confidence = raw.confidence;
  }

  const whyThisDiagnosis = typeof raw.why_this_diagnosis === 'string' ? raw.why_this_diagnosis.trim() : undefined;

  const rawRationale = (raw.clinical_rationale && typeof raw.clinical_rationale === 'object'
    ? raw.clinical_rationale
    : null) as Record<string, unknown> | null;

  // Extract supporting findings if present in raw format
  const rawSupporting = Array.isArray(raw.supporting_findings)
    ? (raw.supporting_findings as Array<Record<string, unknown>>)
    : [];

  const rawMissing = Array.isArray(raw.missing_findings)
    ? (raw.missing_findings as string[])
    : Array.isArray(raw.missing_or_conflicting_facts)
    ? (raw.missing_or_conflicting_facts as string[])
    : [];

  const rawChecks = Array.isArray(raw.recommended_checks)
    ? (raw.recommended_checks as string[])
    : [];

  // Build normalized clinical_rationale
  const summary = String(
    rawRationale?.summary ??
    whyThisDiagnosis ??
    `${diagnosis} (${icd10Code}) рассматривается в дифференциально-диагностическом ряду.`,
  ).trim();

  const supportingPatientFacts = Array.isArray(rawRationale?.supporting_patient_facts)
    ? (rawRationale!.supporting_patient_facts as Array<Record<string, unknown>>).map((f) => ({
        fact: String(f.fact ?? '').trim(),
        patient_evidence: String(f.patient_evidence ?? '').trim(),
      })).filter((f) => f.fact.length > 0)
    : rawSupporting.map((f) => ({
        fact: String(f.finding ?? f.fact ?? '').trim(),
        patient_evidence: String(f.patient_evidence ?? '').trim(),
      })).filter((f) => f.fact.length > 0);

  const missingOrConflictingFacts = Array.isArray(rawRationale?.missing_or_conflicting_facts)
    ? (rawRationale!.missing_or_conflicting_facts as string[]).map((s) => String(s).trim()).filter(Boolean)
    : rawMissing.map((s) => String(s).trim()).filter(Boolean);

  const whyThisRank = String(
    rawRationale?.why_this_rank ??
    `Позиция #${rank} в ранжированном ряду по результатам дифференциального анализа.`,
  ).trim();

  const nextDiscriminator = String(
    rawRationale?.next_discriminator ??
    (rawChecks[0] || 'Требуется клино-лабораторное уточнение.'),
  ).trim();

  // Enforce source_ids exist in top-level sources
  const rawSourceIds = Array.isArray(rawRationale?.source_ids)
    ? (rawRationale!.source_ids as string[]).map((s) => String(s).trim())
    : [];
  const validSourceIds = rawSourceIds.filter((id) => availableSourceIds.has(id));

  return {
    rank,
    diagnosis,
    icd10_code: icd10Code,
    confidence,
    why_this_diagnosis: whyThisDiagnosis || summary,
    clinical_rationale: {
      summary: summary || `${diagnosis} включён в дифференциальный ряд.`,
      supporting_patient_facts: supportingPatientFacts,
      missing_or_conflicting_facts: missingOrConflictingFacts,
      why_this_rank: whyThisRank,
      next_discriminator: nextDiscriminator,
      source_ids: validSourceIds,
    },
    supporting_findings: supportingPatientFacts.map((f) => ({ finding: f.fact, patient_evidence: f.patient_evidence })),
    missing_findings: missingOrConflictingFacts,
    recommended_checks: [nextDiscriminator],
  };
}

export function normalizeDiagnoseResponse(
  raw: Record<string, unknown>,
  requestId: string,
  overrideRagStatus?: 'rag-ready' | 'rag-empty' | 'fallback' | 'unavailable',
): DiagnoseResponse {
  const caseId = String(raw.case_id ?? `case-${Date.now()}`);
  const rawSources = Array.isArray(raw.sources) ? (raw.sources as Array<Record<string, unknown>>) : [];

  const sources: ProtocolSource[] = rawSources.map((s) => ({
    id: s.id ? String(s.id) : undefined,
    title: String(s.title ?? 'Клинический протокол МЗ РК'),
    protocolId: s.protocolId || s.protocol_id ? String(s.protocolId ?? s.protocol_id) : undefined,
    sourceFile: s.sourceFile || s.source_file ? String(s.sourceFile ?? s.source_file) : undefined,
    sectionType: s.sectionType || s.section_type ? String(s.sectionType ?? s.section_type) : undefined,
    chunkText: s.chunkText || s.chunk_text ? String(s.chunkText ?? s.chunk_text) : undefined,
    excerpt: s.excerpt ? String(s.excerpt) : undefined,
    url: s.url ? String(s.url) : undefined,
  }));

  const availableSourceIds = new Set<string>();
  for (const s of sources) {
    if (s.id) availableSourceIds.add(s.id);
    if (s.protocolId) availableSourceIds.add(s.protocolId);
  }

  const rawDiagnoses = Array.isArray(raw.diagnoses) ? (raw.diagnoses as Array<Record<string, unknown>>) : [];
  const diagnoses = rawDiagnoses.map((d, i) => normalizeDiagnosisItem(d, i, availableSourceIds));

  const rawQuestions = Array.isArray(raw.follow_up_questions) ? (raw.follow_up_questions as Array<Record<string, unknown>>) : [];
  const followUpQuestions = rawQuestions.map((q) => ({
    question: String(q.question ?? '').trim(),
    target_diagnoses: Array.isArray(q.target_diagnoses) ? (q.target_diagnoses as string[]).map(String) : [],
    rationale: q.rationale ? String(q.rationale) : undefined,
  })).filter((q) => q.question.length > 0);

  let ragStatus: 'rag-ready' | 'rag-empty' | 'fallback' | 'unavailable' = 'fallback';
  if (overrideRagStatus) {
    ragStatus = overrideRagStatus;
  } else if (raw.rag_status === 'rag-ready' || raw.rag_status === 'rag-empty' || raw.rag_status === 'fallback' || raw.rag_status === 'unavailable') {
    ragStatus = raw.rag_status;
  } else {
    ragStatus = sources.length > 0 ? 'rag-ready' : 'fallback';
  }

  return DiagnoseResponseSchema.parse({
    case_id: caseId,
    diagnoses,
    sources,
    follow_up_questions: followUpQuestions,
    rag_status: ragStatus,
    cached_context: Boolean(raw.cached_context),
    interaction_count: typeof raw.interaction_count === 'number' ? raw.interaction_count : 1,
    generation_provider: getActiveLlmProvider() === 'alem' ? 'alem' : 'mock',
    request_id: requestId,
  });
}

export async function generateAlemClinicalFallback(
  symptoms: string,
  requestId: string,
): Promise<DiagnoseResponse> {
  const provider = getActiveLlmProvider();

  if (provider === 'mock') {
    return generateMockDiagnoseResponse(symptoms, requestId);
  }

  const systemPrompt = `Ты профессиональный клинический AI-консультант для обучения врачей и студентов.
Твоя задача — сформировать структурированный дифференциально-диагностический ряд по симптомам.

СТРОГИЕ ПРАВИЛА:
1. НЕ называй себя настоящим врачом или финальным экспертом. Ответ является обучающим AI-обоснованием и требует проверки врачом.
2. В "clinical_rationale.summary" дай 1-2 предложения четкого обоснования, почему данный диагноз включен. Поле "summary" ОБЯЗАТЕЛЬНО для каждого диагноза.
3. В "supporting_patient_facts" включай только те факты, подтверждение которых ("patient_evidence") ЕСТЬ во введённом тексте пациента.
4. Симптомы или факты, отсутствующие во введённом тексте, помещай ТОЛЬКО в "missing_or_conflicting_facts".
5. У тебя НЕТ внешних RAG-источников в этом режиме, поэтому "source_ids" должен быть пуст ([]), а "sources" — пустой массив ([]). ЗАПРЕЩЕНО выдумывать названия или ID протоколов.
6. Отвечай СТРОГО на русском языке в формате JSON.

Структура JSON:
{
  "case_id": "alem-fallback-${Date.now()}",
  "diagnoses": [
    {
      "rank": 1,
      "diagnosis": "...",
      "icd10_code": "...",
      "confidence": "high|medium|low",
      "clinical_rationale": {
        "summary": "1-2 предложения: почему вариант рассматривается",
        "supporting_patient_facts": [
          { "fact": "...", "patient_evidence": "точная фраза из текста" }
        ],
        "missing_or_conflicting_facts": ["неизвестный фактор или отсутствие критиерия"],
        "why_this_rank": "почему №1 среди остальных",
        "next_discriminator": "какой вопрос/анализ ключевой для дифференциала",
        "source_ids": []
      }
    }
  ],
  "sources": [],
  "follow_up_questions": [
    { "question": "...", "target_diagnoses": ["..."], "rationale": "..." }
  ]
}`;

  const userPrompt = `Симптомы пациента:\n${symptoms}\n\nСформируй дифференциально-диагностический ряд с обязательным обоснованием (clinical_rationale).`;

  const rawResult = await callClinicalJson<Record<string, unknown>>(userPrompt, {
    system: systemPrompt,
    maxTokens: 2500,
    timeoutMs: 45000,
  });

  if (!rawResult || !Array.isArray(rawResult.diagnoses) || !rawResult.diagnoses.length) {
    return generateMockDiagnoseResponse(symptoms, requestId);
  }

  // Temporary debug marker: this path has NO real RAG retrieval behind it
  // (see rule 5 in systemPrompt above) -- tag it so it's visually
  // distinguishable on the deployed site from a genuine protocol-grounded
  // askhat_rag response.
  for (const d of rawResult.diagnoses as Array<Record<string, unknown>>) {
    const rationale = d.clinical_rationale as Record<string, unknown> | undefined;
    if (rationale && typeof rationale.summary === 'string' && !rationale.summary.includes('[NO-RAG-FALLBACK]')) {
      rationale.summary = `${rationale.summary} [NO-RAG-FALLBACK]`.trim();
    }
  }

  return normalizeDiagnoseResponse(
    {
      ...rawResult,
      case_id: rawResult.case_id || `alem-${Date.now()}`,
      sources: [],
      rag_status: 'fallback',
    },
    requestId,
    'fallback',
  );
}

export function generateMockDiagnoseResponse(symptoms: string, requestId: string): DiagnoseResponse {
  const text = symptoms.toLowerCase();

  const isChestPain = text.includes('боль в груди') || text.includes('груд') || text.includes('сердц');
  const isHeadache = text.includes('голов') || text.includes('голова');

  let mockDiagnoses: DiagnosisItem[];

  if (isChestPain) {
    mockDiagnoses = [
      {
        rank: 1,
        diagnosis: 'Ишемическая болезнь сердца: Стенокардия напряжения',
        icd10_code: 'I20.8',
        confidence: 'high',
        why_this_diagnosis: 'Характерные боли в груди при физической нагрузке с типичным иррадиированием.',
        clinical_rationale: {
          summary: 'Боль в груди требует первоочередного исключения ишемии миокарда и острого коронарного синдрома.',
          supporting_patient_facts: [
            { fact: 'Жалобы на боль в груди', patient_evidence: symptoms.slice(0, 50) },
          ],
          missing_or_conflicting_facts: ['Не проведена ЭКГ в покое и на высоте приступа', 'Не оценен уровень тропонина I/T'],
          why_this_rank: 'Первое место из-за потенциально жизнеугрожающего характера коронарного синдрома.',
          next_discriminator: 'Срочная регистрация ЭКГ в 12 отведениях и экспресс-тест на тропонин.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Жалобы на боль в груди', patient_evidence: symptoms.slice(0, 50) }],
        missing_findings: ['ЭКГ в 12 отведениях', 'Тропонин I/T'],
        recommended_checks: ['Срочная регистрация ЭКГ в 12 отведениях'],
      },
      {
        rank: 2,
        diagnosis: 'Гастроэзофагеальная рефлюксная болезнь (ГЭРБ)',
        icd10_code: 'K21.9',
        confidence: 'medium',
        why_this_diagnosis: 'Загрудинные боли псевдокоронарного характера, часто усиливающиеся после еды.',
        clinical_rationale: {
          summary: 'ГЭРБ часто имитирует стенокардию за счет спазма пищевода и изжоги.',
          supporting_patient_facts: [
            { fact: 'Дискомфорт в грудной клетке', patient_evidence: symptoms.slice(0, 40) },
          ],
          missing_or_conflicting_facts: ['Отсутствуют данные ЭГДС', 'Не проводилась суточная рН-импедансометрия'],
          why_this_rank: 'Вторая позиция как частая внесердечная причина загрудинных болей.',
          next_discriminator: 'Пробная терапия ИПП и ЭГДС при наличии симптомов тревоги.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Дискомфорт в груди', patient_evidence: symptoms.slice(0, 40) }],
        missing_findings: ['ЭГДС'],
        recommended_checks: ['ЭГДС'],
      },
      {
        rank: 3,
        diagnosis: 'Межрёберная невралгия / Межпозвонковый остеохондроз',
        icd10_code: 'M79.2',
        confidence: 'low',
        why_this_diagnosis: 'Болевой синдром, связанный с движением грудной клетки и пальпацией.',
        clinical_rationale: {
          summary: 'Костно-мышечная боль ассоциирована с пальпацией межреберий и поворотами туловища.',
          supporting_patient_facts: [
            { fact: 'Локальная болезненность', patient_evidence: symptoms.slice(0, 30) },
          ],
          missing_or_conflicting_facts: ['Не проверена пальпация остистых отростков'],
          why_this_rank: 'Третья позиция диагноза исключения после сердечно-сосудистой патологии.',
          next_discriminator: 'Пальпация грудной клетки и оценка связи с дыханием.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Локальная болезненность', patient_evidence: symptoms.slice(0, 30) }],
        missing_findings: ['Пальпация'],
        recommended_checks: ['Пальпация грудной клетки'],
      },
    ];
  } else if (isHeadache) {
    mockDiagnoses = [
      {
        rank: 1,
        diagnosis: 'Первичная головная боль напряжения',
        icd10_code: 'G44.2',
        confidence: 'high',
        why_this_diagnosis: 'Давящая давяще-сжимающая головная боль двусторонней локализации.',
        clinical_rationale: {
          summary: 'Головная боль напряжения — наиболее частая причина двусторонней давящей боли.',
          supporting_patient_facts: [
            { fact: 'Головная боль', patient_evidence: symptoms.slice(0, 40) },
          ],
          missing_or_conflicting_facts: ['Не исключены очаговые неврологические симптомы'],
          why_this_rank: 'Наиболее высокая эпидемиологическая частота среди первичных цефалгий.',
          next_discriminator: 'Неврологический осмотр для исключения очаговой симптоматики.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Головная боль', patient_evidence: symptoms.slice(0, 40) }],
        missing_findings: ['Неврологический осмотр'],
        recommended_checks: ['Неврологический осмотр'],
      },
      {
        rank: 2,
        diagnosis: 'Артериальная гипертензия',
        icd10_code: 'I10',
        confidence: 'medium',
        why_this_diagnosis: 'Головные боли затылочной локализации на фоне повышения АД.',
        clinical_rationale: {
          summary: 'Повышение артериального давления может провоцировать затылочную цефалгию.',
          supporting_patient_facts: [
            { fact: 'Цефалгия', patient_evidence: symptoms.slice(0, 30) },
          ],
          missing_or_conflicting_facts: ['Нет дневника суточного контроля АД'],
          why_this_rank: 'Второе место требует обязательного тонометрического контроля.',
          next_discriminator: 'Измерение АД на обеих руках в покое.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Цефалгия', patient_evidence: symptoms.slice(0, 30) }],
        missing_findings: ['Суточный контроль АД'],
        recommended_checks: ['Измерение АД'],
      },
      {
        rank: 3,
        diagnosis: 'Мигрень без ауры',
        icd10_code: 'G43.0',
        confidence: 'low',
        why_this_diagnosis: 'Пульсирующая односторонняя боль, усиливающаяся при физической активности.',
        clinical_rationale: {
          summary: 'Мигрень характеризуется приступообразной пульсирующей гемикранией.',
          supporting_patient_facts: [
            { fact: 'Приступообразная боль', patient_evidence: symptoms.slice(0, 30) },
          ],
          missing_or_conflicting_facts: ['Не уточнены фото- и фонофобия, тошнота'],
          why_this_rank: 'Третья позиция при наличии типичного цефалгического анамнеза.',
          next_discriminator: 'Оценка критериев ICHD-3 (тошнота, фотофобия).',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Приступообразная боль', patient_evidence: symptoms.slice(0, 30) }],
        missing_findings: ['Критерии ICHD-3'],
        recommended_checks: ['Оценка вегетативных сопровождений'],
      },
    ];
  } else {
    mockDiagnoses = [
      {
        rank: 1,
        diagnosis: 'Острая респираторная вирусная инфекция (ОРВИ)',
        icd10_code: 'J06.9',
        confidence: 'high',
        why_this_diagnosis: 'Острое начало, лихорадочный и катаральный синдромы.',
        clinical_rationale: {
          summary: 'ОРВИ является наиболее частой причиной острого катарального и лихорадочного синдрома.',
          supporting_patient_facts: [
            { fact: 'Жалобы пациента', patient_evidence: symptoms.slice(0, 50) },
          ],
          missing_or_conflicting_facts: ['Отсутствуют данные физикального осмотра зева и фарингоскопии'],
          why_this_rank: 'Первая позиция по высокой частоте встречаемости в амбулаторной практике.',
          next_discriminator: 'Осмотр зева и аускультация лёгких.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Жалобы пациента', patient_evidence: symptoms.slice(0, 50) }],
        missing_findings: ['Фарингоскопия', 'Аускультация'],
        recommended_checks: ['Осмотр зева'],
      },
      {
        rank: 2,
        diagnosis: 'Острый бронхит',
        icd10_code: 'J20.9',
        confidence: 'medium',
        why_this_diagnosis: 'Кашель и дыхательный дискомфорт с сохраняющейся субфебрильной температурой.',
        clinical_rationale: {
          summary: 'Острый бронхит сопровождается поражением нижних дыхательных путей и кашлем.',
          supporting_patient_facts: [
            { fact: 'Катаральные симптомы', patient_evidence: symptoms.slice(0, 40) },
          ],
          missing_or_conflicting_facts: ['Не проведена аускультация лёгких для выявления сухих/влажных хрипов'],
          why_this_rank: 'Вторая позиция при подозрении на вовлечение бронхиального дерева.',
          next_discriminator: 'Аускультация лёгких и пульсоксиметрия.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Катаральные симптомы', patient_evidence: symptoms.slice(0, 40) }],
        missing_findings: ['Аускультация лёгких'],
        recommended_checks: ['Аускультация лёгких'],
      },
      {
        rank: 3,
        diagnosis: 'Астенический синдром / Синдром переутомления',
        icd10_code: 'F48.0',
        confidence: 'low',
        why_this_diagnosis: 'Общая слабость и неспецифические жалобы без очаговой симптоматики.',
        clinical_rationale: {
          summary: 'Астенический синдром развивается на фоне психоэмоционального или физического перенапряжения.',
          supporting_patient_facts: [
            { fact: 'Неспецифическое недомогание', patient_evidence: symptoms.slice(0, 30) },
          ],
          missing_or_conflicting_facts: ['Не исключены соматические и эндокринные причины (тиреотоксикоз/гипотиреоз)'],
          why_this_rank: 'Третья позиция функционального характера после исключения инфекций.',
          next_discriminator: 'Скрининг функции щитовидной железы (ТТГ) и ОАК.',
          source_ids: [],
        },
        supporting_findings: [{ finding: 'Неспецифическое недомогание', patient_evidence: symptoms.slice(0, 30) }],
        missing_findings: ['Анализ ТТГ', 'ОАК'],
        recommended_checks: ['ОКК и ТТГ'],
      },
    ];
  }

  return DiagnoseResponseSchema.parse({
    case_id: `mock-${Date.now()}`,
    diagnoses: mockDiagnoses,
    sources: [],
    follow_up_questions: [
      {
        question: 'Как давно появились данные симптомы и есть ли отягощённый анамнез?',
        target_diagnoses: [mockDiagnoses[0]?.diagnosis ?? 'ОРВИ'],
        rationale: 'Уточнение динамики заболевания помогает провести дифференциальную диагностику.',
      },
    ],
    rag_status: 'fallback',
    cached_context: false,
    interaction_count: 1,
    generation_provider: 'mock',
    request_id: requestId,
  });
}
