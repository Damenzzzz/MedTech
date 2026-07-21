import 'server-only';

type JsonValue = Record<string, unknown>;
type CallOptions = {
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
};

const MOCK_JSON: JsonValue = {
  answer: 'Мне трудно ответить. Уточните, пожалуйста, вопрос.',
  intent: 'mock-response',
  newFactIds: [],
  visualState: 'speaking',
};

const MOCK_TEXT = 'Мне трудно ответить. Уточните, пожалуйста, вопрос.';

export async function mockCallJson<T extends JsonValue>(prompt: string, _options?: CallOptions): Promise<T | null> {
  if (prompt.includes('diagnoses') || prompt.includes('case_id') || prompt.includes('icd10_code')) {
    return {
      case_id: 'alem-fallback',
      diagnoses: [
        {
          rank: 1,
          diagnosis: 'Острая вирусная инфекция верхних дыхательных путей',
          icd10_code: 'J06.9',
          confidence: 'high',
          why_this_diagnosis: 'Характерные симптомы ОРВИ',
          supporting_findings: [{ finding: 'Першение в горле', patient_evidence: 'першение в горле' }],
          missing_findings: [],
          recommended_checks: [],
        },
      ],
      follow_up_questions: [],
    } as unknown as T;
  }
  return MOCK_JSON as T;
}

export async function mockCallText(_prompt: string, _options?: CallOptions): Promise<string | null> {
  return MOCK_TEXT;
}
