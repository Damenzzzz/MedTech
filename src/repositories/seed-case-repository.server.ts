import 'server-only';
import { cases } from '@/data/cases.server';
import {
  StudentCaseDTOSchema,
  type StudentCaseDTO,
  type StudentExaminationDTO,
  type StudentInvestigationDTO,
  type StudentDifferentialDTO,
  type ManagementOption,
} from '@/domain/schemas';
import type { CaseRepository } from './case-repository';

const toStudentDTO = (item: (typeof cases)[number]): StudentCaseDTO => {
  const examinations: StudentExaminationDTO[] = item.examinations.map((e) => ({
    id: e.id,
    category: e.category,
    label: e.label,
  }));

  const investigations: StudentInvestigationDTO[] = item.investigations.map((i) => ({
    id: i.id,
    category: i.category,
    name: i.name,
    cost: i.cost,
    delayMs: i.delayMs,
  }));

  const differentials: StudentDifferentialDTO[] = item.differentials.map((d) => ({
    code: d.code,
    name: d.name,
  }));

  const managementOptions: ManagementOption[] = [
    ...item.managementPlan.recommendations.map((r, idx) => ({
      id: `rec-${idx}`,
      category: 'recommendation' as const,
      label: r,
    })),
    ...item.managementPlan.medications.map((m, idx) => ({
      id: `med-${idx}`,
      category: 'medication' as const,
      label: m,
    })),
    ...item.managementPlan.nonDrug.map((nd, idx) => ({
      id: `nondrug-${idx}`,
      category: 'nonDrug' as const,
      label: nd,
    })),
    {
      id: 'disp-1',
      category: 'disposition' as const,
      label: item.managementPlan.disposition,
    },
    ...item.managementPlan.redFlags.map((rf, idx) => ({
      id: `rf-${idx}`,
      category: 'redFlag' as const,
      label: rf,
    })),
  ];

  return StudentCaseDTOSchema.parse({
    id: item.id,
    synthetic: item.synthetic,
    medicalReviewStatus: item.medicalReviewStatus,
    title: item.title,
    specialty: item.specialty,
    patient: item.patient,
    complaint: item.complaint,
    urgency: item.urgency,
    difficulty: item.difficulty,
    durationMinutes: item.durationMinutes,
    visualStates: item.visualStates,
    vitals: item.vitals,
    examinations,
    investigations,
    differentials,
    managementOptions,
  });
};

export class SeedCaseRepository implements CaseRepository {
  async listStudentCases() {
    return cases.map(toStudentDTO);
  }

  async getStudentCase(id: string) {
    const found = cases.find((x) => x.id === id);
    return found ? toStudentDTO(found) : null;
  }

  async getGroundTruth(id: string) {
    return cases.find((x) => x.id === id) ?? null;
  }
}
