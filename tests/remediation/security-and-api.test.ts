import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { SeedCaseRepository } from '@/repositories/seed-case-repository.server';
import { POST as performExam } from '@/app/api/session/examinations/perform/route';
import { POST as orderTest } from '@/app/api/session/investigations/order/route';
import { POST as diagnoseApi } from '@/app/api/clinical/diagnose/route';
import { POST as refineApi } from '@/app/api/clinical/refine/route';

// Helper function to recursively inspect keys in any JSON object
function getAllObjectKeys(obj: unknown): string[] {
  const keys: string[] = [];
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        keys.push(...getAllObjectKeys(item));
      }
    } else {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        keys.push(key);
        keys.push(...getAllObjectKeys(value));
      }
    }
  }
  return keys;
}

describe('Remediation & Ground Truth Security Tests', () => {
  const repo = new SeedCaseRepository();

  it('1. StudentCaseDTO recursively strips nested ground truth', async () => {
    const studentCases = await repo.listStudentCases();
    expect(studentCases.length).toBeGreaterThan(0);

    const FORBIDDEN_KEYS = [
      'hiddenFacts',
      'correctDiagnosis',
      'expectedActions',
      'dangerousActions',
      'scoringRubric',
      'managementPlan',
      'indicated',
      'required',
      'relevant',
      'result',
    ];

    for (const dto of studentCases) {
      const allKeys = getAllObjectKeys(dto);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(
          allKeys.includes(forbidden),
          `Key "${forbidden}" found in StudentCaseDTO for ${dto.id}`
        ).toBe(false);
      }
    }
  });

  it('2. Examination perform endpoint returns result only after invocation', async () => {
    const req = new Request('http://localhost/api/session/examinations/perform', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: 'chest-pain',
        examinationId: 'chest_palpation',
        locale: 'ru',
      }),
    });

    const res = await performExam(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe('chest_palpation');
    expect(json.result).toBeTruthy();
    expect(json.performedAt).toBeGreaterThan(0);

    // Ensure ground truth / relevant is NOT leaked in response
    expect(json.relevant).toBeUndefined();
    expect(json.indicated).toBeUndefined();
  });

  it('3. Investigation order endpoint returns result without indicated', async () => {
    const req = new Request('http://localhost/api/session/investigations/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: 'chest-pain',
        investigationId: 'cbc',
        locale: 'ru',
      }),
    });

    const res = await orderTest(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe('cbc');
    expect(json.result).toBeTruthy();
    expect(json.delayMs).toBeGreaterThanOrEqual(0);

    // Ensure indicated / cost leakage is NOT present
    expect(json.indicated).toBeUndefined();
  });

  it('4. Diagnose saves case_id or returns session id', async () => {
    const req = new Request('http://localhost/api/clinical/diagnose', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symptoms: 'Мужчина 46 лет, боль в груди 40 минут' }),
    });

    const res = await diagnoseApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.case_id).toBeTruthy();
    expect(Array.isArray(json.diagnoses)).toBe(true);
  });

  it('5. Refine sends case_id and additional_info', async () => {
    const req = new Request('http://localhost/api/clinical/refine', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        case_id: 'test-case-id',
        additional_info: 'Боль отдаёт в левую руку',
        symptoms: 'Боль в груди',
      }),
    });

    const res = await refineApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.rag_status).toBeTruthy();
  });

  it('6. Refine handles error gracefully without silent swallowing', async () => {
    const req = new Request('http://localhost/api/clinical/refine', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await refineApi(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('7. Empty sources are not replaced by fake protocols', async () => {
    const req = new Request('http://localhost/api/clinical/diagnose', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symptoms: 'Тестовые симптомы' }),
    });

    const res = await diagnoseApi(req);
    const json = await res.json();

    if (json.rag_status === 'fallback') {
      expect(json.sources).toEqual([]);
    }
  });

  it('8. Unknown caseId returns 404 for examination and investigation endpoints', async () => {
    const examReq = new Request('http://localhost/api/session/examinations/perform', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caseId: 'unknown-id', examinationId: 'general' }),
    });
    const examRes = await performExam(examReq);
    expect(examRes.status).toBe(404);

    const testReq = new Request('http://localhost/api/session/investigations/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caseId: 'unknown-id', investigationId: 'cbc' }),
    });
    const testRes = await orderTest(testReq);
    expect(testRes.status).toBe(404);
  });
});
