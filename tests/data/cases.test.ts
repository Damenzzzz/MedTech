import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { cases } from '@/data/cases.server';
import { SeedCaseRepository } from '@/repositories/seed-case-repository.server';
import fs from 'fs';
import path from 'path';

describe('32 Cases Database & Clinical Rich Content Validation', () => {
  const repo = new SeedCaseRepository();

  it('1. contains at least 32 synthetic medical cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(32);
  });

  it('2. ensures all case IDs are unique', () => {
    const ids = cases.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(cases.length);
  });

  it('3. covers all 8 required specialties with at least 4 cases each', () => {
    const specialties = cases.map((c) => c.specialty);
    const requiredSpecialties = [
      'therapy',
      'cardiology',
      'neurology',
      'pulmonology',
      'gastroenterology',
      'endocrinology',
      'infectious',
      'emergency',
    ];

    for (const spec of requiredSpecialties) {
      const count = specialties.filter((s) => s === spec).length;
      expect(count, `Specialty ${spec} should have at least 4 cases`).toBeGreaterThanOrEqual(4);
    }
  });

  it('4. ensures patient names are unique', () => {
    const names = cases.map((c) => c.patient.name.ru);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(cases.length);
  });

  it('5. ensures every case has a local SVG portrait asset', () => {
    for (const item of cases) {
      const portraitPath = path.join(process.cwd(), 'public', 'patients', item.id, 'portrait.svg');
      expect(fs.existsSync(portraitPath), `Portrait for ${item.id} should exist`).toBe(true);
    }
  });

  it('6. validates case-specific rich content for all 32 cases', () => {
    for (const c of cases) {
      expect(c.examinations.length, `Case ${c.id} examinations count`).toBeGreaterThanOrEqual(3);
      expect(c.investigations.length, `Case ${c.id} investigations count`).toBeGreaterThanOrEqual(4);
      expect(c.differentials.length, `Case ${c.id} differentials count`).toBeGreaterThanOrEqual(4);

      // Management plan validation
      expect(c.managementPlan.recommendations.length).toBeGreaterThan(0);
      expect(c.managementPlan.medications.length).toBeGreaterThan(0);
      expect(c.managementPlan.nonDrug.length).toBeGreaterThan(0);
      expect(c.managementPlan.disposition.ru).toBeTruthy();
      expect(c.managementPlan.followUp.ru).toBeTruthy();
      expect(c.managementPlan.redFlags.length).toBeGreaterThan(0);

      // Actions validation
      expect(c.expectedActions.length, `Case ${c.id} expectedActions`).toBeGreaterThan(0);
      expect(c.dangerousActions.length, `Case ${c.id} dangerousActions`).toBeGreaterThan(0);

      // Rubric sum validation
      const rubricSum =
        c.scoringRubric.history +
        c.scoringRubric.examination +
        c.scoringRubric.investigations +
        c.scoringRubric.differential +
        c.scoringRubric.diagnosis +
        c.scoringRubric.management +
        c.scoringRubric.communication +
        c.scoringRubric.critical;

      expect(rubricSum, `Case ${c.id} scoring rubric sum`).toBe(100);

      // Localization validation
      expect(c.title.ru).toBeTruthy();
      expect(c.title.kk).toBeTruthy();
      expect(c.title.en).toBeTruthy();
      expect(c.complaint.ru).toBeTruthy();
      expect(c.complaint.kk).toBeTruthy();
      expect(c.complaint.en).toBeTruthy();

      // Correct diagnosis presence
      const hasCorrectInDifferentials = c.differentials.some((d) => d.code === c.correctDiagnosis.code);
      expect(hasCorrectInDifferentials, `Case ${c.id} correct diagnosis in differentials`).toBe(true);

      // Status preservation
      expect(c.synthetic).toBe(true);
      expect(c.medicalReviewStatus).toBe('unreviewed');
    }
  });

  it('7. prevents ground truth leakage in StudentCaseDTO', async () => {
    const studentCases = await repo.listStudentCases();
    expect(studentCases.length).toBe(cases.length);

    for (const dto of studentCases) {
      const record = dto as unknown as Record<string, unknown>;
      expect(record.correctDiagnosis).toBeUndefined();
      expect(record.hiddenFacts).toBeUndefined();
      expect(record.expectedActions).toBeUndefined();
      expect(record.dangerousActions).toBeUndefined();
      expect(record.scoringRubric).toBeUndefined();
    }
  });
});
