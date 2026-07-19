import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { cases } from '@/data/cases.server';
import { SeedCaseRepository } from '@/repositories/seed-case-repository.server';
import fs from 'fs';
import path from 'path';

describe('Cases Database & Security Verification', () => {
  const repo = new SeedCaseRepository();

  it('contains at least 32 synthetic medical cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(32);
  });

  it('ensures all case IDs are unique', () => {
    const ids = cases.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(cases.length);
  });

  it('covers all 8 required specialties with cases', () => {
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
      expect(count, `Specialty ${spec} should have at least 1 case`).toBeGreaterThanOrEqual(1);
    }
  });

  it('ensures every case has a local SVG portrait asset', () => {
    for (const item of cases) {
      const portraitPath = path.join(process.cwd(), 'public', 'patients', item.id, 'portrait.svg');
      expect(fs.existsSync(portraitPath), `Portrait for ${item.id} should exist`).toBe(true);
    }
  });

  it('prevents ground truth leakage in StudentCaseDTO', async () => {
    const studentCases = await repo.listStudentCases();
    expect(studentCases.length).toBe(cases.length);

    for (const dto of studentCases) {
      // @ts-expect-error correctDiagnosis must not exist on StudentCaseDTO
      expect(dto.correctDiagnosis).toBeUndefined();
      // @ts-expect-error hiddenFacts must not exist on StudentCaseDTO
      expect(dto.hiddenFacts).toBeUndefined();
      // @ts-expect-error expectedActions must not exist on StudentCaseDTO
      expect(dto.expectedActions).toBeUndefined();
    }
  });
});
