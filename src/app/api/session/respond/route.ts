import 'server-only';
import { LlmPatientEngine } from '@/engines/llm-patient-engine.server';
import { MockPatientEngine } from '@/engines/mock-patient-engine.server';
import { PatientMessageInputSchema } from '@/engines/patient-engine';
import { getLlmProvider } from '@/lib/ai/provider-config.server';
import { getCaseRepository } from '@/repositories/index.server';

const DIAGNOSIS_LEAK_PATTERNS = [
  /\bмкб[-\s]?10\b/i,
  /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/, // ICD code pattern
  /\bscoring\b/i,
  /\bexpected\s*(?:actions?|plan)\b/i,
  /\bunsafe\s*plan\b/i,
  /\bhidden\s*(?:context|facts?)\b/i,
  /\bsystem\s*prompt\b/i,
];

function containsGroundTruthLeak(
  answer: string,
  correctDiagnosisCode: string,
  correctDiagnosisName: string,
): boolean {
  const lower = answer.toLowerCase();
  // Check if the answer contains the exact correct diagnosis code
  if (correctDiagnosisCode && lower.includes(correctDiagnosisCode.toLowerCase())) {
    return true;
  }
  if (correctDiagnosisName && correctDiagnosisName.length > 5 && lower.includes(correctDiagnosisName.toLowerCase())) {
    return true;
  }
  // Check for suspicious patterns
  for (const pattern of DIAGNOSIS_LEAK_PATTERNS) {
    if (pattern.test(answer)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const raw = await request.json();
    const input = PatientMessageInputSchema.parse(raw);

    // Verify case exists
    const caseItem = await getCaseRepository().getGroundTruth(input.caseId);
    if (!caseItem) {
      return Response.json(
        { error: 'case_not_found', requestId },
        { status: 404 },
      );
    }

    const provider = getLlmProvider();
    let engineMode: 'llm' | 'deterministic-fallback' = provider === 'alem' ? 'llm' : 'deterministic-fallback';
    let result;

    try {
      if (provider === 'alem') {
        result = await new LlmPatientEngine().respond(input);
      } else {
        result = await new MockPatientEngine().respond(input);
        engineMode = 'deterministic-fallback';
      }
    } catch {
      // Fallback to mock on LLM failure
      result = await new MockPatientEngine().respond(input);
      engineMode = 'deterministic-fallback';
    }

    // Post-generation safety: check for ground truth leak
    const diagCode = caseItem.correctDiagnosis?.code ?? '';
    const diagName = caseItem.correctDiagnosis?.name?.ru ?? '';
    if (engineMode === 'llm' && containsGroundTruthLeak(result.answer, diagCode, diagName)) {
      console.warn('[session/respond] LLM response contained ground truth leak, falling back', {
        requestId,
        provider,
        caseId: input.caseId,
      });
      // Use deterministic fallback instead
      result = await new MockPatientEngine().respond(input);
      engineMode = 'deterministic-fallback';
    }

    return Response.json({
      ...result,
      engineMode,
      provider,
      requestId,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'invalid_request', requestId },
      { status: 400 },
    );
  }
}
