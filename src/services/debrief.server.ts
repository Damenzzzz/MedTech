import 'server-only';
import {
  DebriefReferenceSchema,
  DebriefResultSchema,
  TrainingSessionSchema,
  type DebriefReference,
  type DebriefResult,
  type MedicalCase,
  type TrainingSession,
} from '@/domain/schemas';
import { getCaseRepository } from '@/repositories/index.server';
import { collectRagSources, fetchRagContext, type RagPayload } from '@/lib/rag/rag-job.server';

const local = (v: { ru: string; kk?: string; en?: string }) => v.ru;

function buildRagQuery(item: MedicalCase, session?: TrainingSession) {
  const revealed = item.hiddenFacts.filter((f) => session?.revealedFactIds.includes(f.id)).map((f) => local(f.value));
  const actions = session?.actions.map((a) => `${a.type}: ${a.value}`).slice(-20) ?? [];
  return [
    `Учебный клинический случай: ${local(item.title)}`,
    `Жалоба: ${local(item.complaint)}`,
    `Витальные показатели: ${JSON.stringify(item.vitals)}`,
    `Эталонный диагноз: ${item.correctDiagnosis.code} ${local(item.correctDiagnosis.name)}`,
    revealed.length ? `Раскрытые факты: ${revealed.join('; ')}` : '',
    session?.finalDiagnosis ? `Диагноз студента: ${session.finalDiagnosis}` : '',
    session?.clinicalReasoning ? `Обоснование студента: ${session.clinicalReasoning}` : '',
    session?.managementNotes ? `План студента: ${session.managementNotes}` : '',
    actions.length ? `Ход приема: ${actions.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

function toReferences(data: RagPayload): DebriefReference[] {
  return collectRagSources(data)
    .slice(0, 3)
    .map((s, i) =>
      DebriefReferenceSchema.parse({
        title: s.title || s.protocol_id || `Источник RAG ${i + 1}`,
        status: 'rag-ready',
        protocolId: s.protocol_id,
        excerpt: s.excerpt ?? s.chunk_text ?? s.text,
      }),
    );
}

function unavailable(title: string, excerpt: string): DebriefReference[] {
  return [DebriefReferenceSchema.parse({ title, status: 'rag-unavailable', excerpt })];
}

/**
 * Protocol sources for a case barely change between attempts, and a job round
 * trip costs 20-60s — so a completed lookup is reused for REFERENCE_TTL_MS.
 * Only successful results are cached; failures must stay retryable.
 */
const REFERENCE_TTL_MS = 30 * 60 * 1000;
const referenceCache = new Map<string, { at: number; references: DebriefReference[] }>();

export async function getRagReferences(item: MedicalCase, session?: TrainingSession): Promise<DebriefReference[]> {
  const cached = referenceCache.get(item.id);
  if (cached && Date.now() - cached.at < REFERENCE_TTL_MS) {
    console.info('[rag telemetry]', { label: 'debrief', status: 'cache-hit', caseId: item.id });
    return cached.references;
  }

  const { status, result } = await fetchRagContext({ symptoms: buildRagQuery(item, session) }, 'debrief');

  if (status === 'rag-not-configured')
    return unavailable(
      'RAG backend не настроен для этого окружения',
      'Укажите RAG_SERVICE_URL, чтобы debrief подтягивал источники из протоколов.',
    );

  if (!result)
    return unavailable(
      'RAG backend недоступен во время debrief',
      'Проверьте, что Python RAG service запущен и RAG_SERVICE_URL указывает на него.',
    );

  const refs = toReferences(result);
  if (!refs.length)
    return unavailable('RAG ответил, но источники не вернул', 'Проверьте формат ответа backend /api/diagnose-jobs.');

  referenceCache.set(item.id, { at: Date.now(), references: refs });
  return refs;
}

export async function getRagReferencesByCaseId(caseId: string) {
  const item = await getCaseRepository().getGroundTruth(caseId);
  if (!item) throw new Error('Case not found');
  return getRagReferences(item);
}

export async function scoreSession(raw: unknown): Promise<DebriefResult> {
  const session = TrainingSessionSchema.parse(raw);
  const item = await getCaseRepository().getGroundTruth(session.caseId);
  if (!item) throw new Error('Case not found');

  const revealedFactIds = new Set(session.revealedFactIds || []);
  const selectedInvestigations = session.selectedInvestigations || [];
  const selectedManagementOptionIds = session.selectedManagementOptionIds || [];
  const studentDiffs = session.differentials || [];

  // 1. History scoring
  const totalFacts = item.hiddenFacts.length || 1;
  const revealedCount = item.hiddenFacts.filter((f) => revealedFactIds.has(f.id)).length;
  const historyScore = Math.round((revealedCount / totalFacts) * 100);

  const foundRedFlags = item.hiddenFacts
    .filter((f) => f.critical && revealedFactIds.has(f.id))
    .map((f) => local(f.value));

  const missedRedFlags = item.hiddenFacts
    .filter((f) => f.critical && !revealedFactIds.has(f.id))
    .map((f) => local(f.value));

  const missedQuestions = item.hiddenFacts
    .filter((f) => !revealedFactIds.has(f.id))
    .map((f) => local(f.value));

  // 2. Examination scoring
  const performedExams = session.actions.filter((a) => a.type === 'examination').map((a) => a.value);
  const relevantExams = item.examinations.filter((e) => e.relevant);
  const performedRelevant = relevantExams.filter((e) => performedExams.includes(e.id));
  const performedIrrelevant = performedExams.filter((id) => !relevantExams.some((e) => e.id === id));

  const examScore =
    performedExams.length === 0
      ? 0
      : Math.max(0, Math.round((performedRelevant.length / (relevantExams.length || 1)) * 100 - performedIrrelevant.length * 20));

  // 3. Investigations scoring (Absence of indicated tests MUST reduce score!)
  const indicatedList = item.investigations.filter((i) => i.indicated);
  const indicatedOrdered = indicatedList.filter((i) => selectedInvestigations.includes(i.id));
  const unnecessaryOrdered = selectedInvestigations.filter((id) => !indicatedList.some((i) => i.id === id));

  let investigationsScore = 0;
  if (selectedInvestigations.length > 0) {
    investigationsScore = Math.max(
      0,
      Math.round((indicatedOrdered.length / (indicatedList.length || 1)) * 100 - unnecessaryOrdered.length * 25),
    );
  }

  const investigationFeedback: string[] = [];
  if (selectedInvestigations.length === 0 && indicatedList.length > 0) {
    investigationFeedback.push('Не назначено ни одного показанного лабораторно-инструментального исследования.');
  } else {
    if (unnecessaryOrdered.length > 0) {
      investigationFeedback.push(`Назначены ненужные исследования: ${unnecessaryOrdered.join(', ')}.`);
    }
    if (indicatedOrdered.length === indicatedList.length) {
      investigationFeedback.push('Все показанные исследования назначены правильно.');
    }
  }

  // 4. Differential scoring
  const correctCode = item.correctDiagnosis.code;
  const hasCorrectInDiff = studentDiffs.includes(correctCode);
  const isRank1 = studentDiffs[0] === correctCode;

  let differentialScore = 0;
  if (studentDiffs.length > 0) {
    differentialScore = Math.min(
      100,
      (hasCorrectInDiff ? 50 : 0) + (isRank1 ? 30 : 0) + (studentDiffs.length >= 2 ? 20 : 0),
    );
  }

  // 5. Diagnosis scoring
  const correctDiagnosisMatch = session.finalDiagnosis === correctCode;
  const diagnosisScore = correctDiagnosisMatch ? 100 : hasCorrectInDiff ? 50 : 0;

  // 6. Management scoring (Evaluates selectedManagementOptionIds, NOT text length!)
  const dangerousSelected = selectedManagementOptionIds.filter((id) => item.dangerousActions.includes(id));
  const expectedSelected = selectedManagementOptionIds.filter((id) => item.expectedActions.includes(id));

  let managementScore = 0;
  if (dangerousSelected.length > 0) {
    managementScore = 0;
  } else if (selectedManagementOptionIds.length > 0) {
    managementScore = Math.min(100, Math.round((expectedSelected.length / (item.expectedActions.length || 1)) * 100));
  } else if (session.managementNotes && session.managementNotes.trim().length > 10) {
    managementScore = 50; // Partial score for text plan without dangerous actions
  }

  // 7. Communication scoring
  const commActions = session.actions.filter((a) => a.type === 'communication');
  const hasSafetyNetting = commActions.some(
    (a) =>
      a.value.toLowerCase().includes('скор') ||
      a.value.toLowerCase().includes('врач') ||
      a.value.toLowerCase().includes('обратит'),
  );

  const communicationScore = commActions.length === 0 ? 0 : hasSafetyNetting ? 100 : 60;

  // 8. Critical errors & Critical Category scoring
  const criticalErrors: string[] = [];
  if (!correctDiagnosisMatch) {
    criticalErrors.push(`Итоговый диагноз (${session.finalDiagnosis || 'не выбран'}) не совпал с эталонным (${correctCode}).`);
  }
  if (dangerousSelected.length > 0) {
    criticalErrors.push(`Выбраны опасные клинические действия: ${dangerousSelected.join(', ')}.`);
  }
  if (missedRedFlags.length > 0) {
    criticalErrors.push(`Пропущены красные флаги: ${missedRedFlags.join('; ')}.`);
  }

  const criticalCategoryScore = Math.max(
    0,
    100 - missedRedFlags.length * 30 - dangerousSelected.length * 40 - (!correctDiagnosisMatch ? 30 : 0),
  );

  const categories = {
    history: historyScore,
    examination: examScore,
    investigations: investigationsScore,
    differential: differentialScore,
    diagnosis: diagnosisScore,
    management: managementScore,
    communication: communicationScore,
    critical: criticalCategoryScore,
  };

  const total = Math.round(
    Object.entries(categories).reduce((sum, [key, value]) => {
      const weight = item.scoringRubric[key as keyof typeof item.scoringRubric] || 10;
      return sum + (value * weight) / 100;
    }, 0),
  );

  const strengths: string[] = [];
  if (historyScore >= 70) strengths.push('Системный сбор анамнеза');
  if (correctDiagnosisMatch) strengths.push('Точно поставлен верный диагноз');
  if (indicatedOrdered.length === indicatedList.length) strengths.push('Полный объём показанных обследований');

  const recommendations: string[] = [];
  if (missedRedFlags.length > 0) recommendations.push('В следующем случае обратите внимание на выявление красных флагов.');
  if (unnecessaryOrdered.length > 0) recommendations.push('Избегайте назначения нерелевантных исследований.');
  if (dangerousSelected.length > 0) recommendations.push('Внимательно проверяйте противопоказания к назначению препаратов.');

  return DebriefResultSchema.parse({
    caseId: item.id,
    total,
    categories,
    missedQuestions,
    foundRedFlags,
    missedRedFlags,
    investigationFeedback,
    criticalErrors,
    strengths: strengths.length ? strengths : ['Сессия завершена с разбором результатов'],
    recommendations: recommendations.length ? recommendations : ['Продолжайте регулярные тренировки'],
    timeline: session.actions,
    // Scoring stays deterministic and network-free: the debrief screen lazily
    // pulls the real protocols via GET /api/session/references.
    referencePlaceholders: [
      DebriefReferenceSchema.parse({
        title: 'Загрузка источников из протоколов…',
        status: 'rag-pending',
      }),
    ],
    correctDiagnosis: `${item.correctDiagnosis.code} — ${local(item.correctDiagnosis.name)}`,
  });
}
