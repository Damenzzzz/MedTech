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

const COMMON_DISTRACTORS: ManagementOption[] = [
  {
    id: 'distractor-ambulatory-followup',
    category: 'recommendation',
    label: { ru: 'Плановое амбулаторное наблюдение через 1-2 недели', kk: '1-2 аптадан соң жоспарлы емханалық бақылау', en: 'Routine outpatient follow-up in 1-2 weeks' },
  },
  {
    id: 'distractor-broad-spectrum-abx',
    category: 'medication',
    label: { ru: 'Назначить эмпирическую антибиотикотерапию (Амоксициллин 500 мг)', kk: 'Эмпирикалық антибиотик тағайындау (Амоксициллин 500 мг)', en: 'Empiric broad-spectrum antibiotic (Amoxicillin 500 mg)' },
  },
  {
    id: 'distractor-nsaid-painkiller',
    category: 'medication',
    label: { ru: 'Назначить НПВС (Ибупрофен 400 мг) для купирования боли', kk: 'Ауырсынуды басу үшін ҚҚБП (Ибупрофен 400 мг) тағайындау', en: 'NSAID (Ibuprofen 400 mg) for analgesia' },
  },
  {
    id: 'distractor-fluid-restriction',
    category: 'nonDrug',
    label: { ru: 'Строгое ограничение жидкости до 500 мл/сутки', kk: 'Сұйықтықты 500 мл/тәулікке дейін қатаң шектеу', en: 'Strict fluid restriction < 500 mL/day' },
  },
  {
    id: 'discharge_home',
    category: 'disposition',
    label: { ru: 'Выписать домой под наблюдение участкового терапевта', kk: 'Учаскелік терапевттің бақылауына үйге шығару', en: 'Discharge home under outpatient GP supervision' },
  },
  {
    id: 'rapid_bp_reduction_to_normal_causes_ischemic_stroke',
    category: 'medication',
    label: { ru: 'Быстро снизить АД на 50% в первый час (Нифедипин сублингвально)', kk: 'Алғашқы сағатта АД-ны 50%-ға шұғыл төмендету', en: 'Rapidly drop BP by 50% in 1st hour (Sublingual nifedipine)' },
  },
];

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

  const correctOptionItems: ManagementOption[] = item.expectedActions.map((actId, idx) => {
    const rawLabel =
      item.managementPlan.recommendations[idx] ||
      item.managementPlan.medications[idx] ||
      item.managementPlan.nonDrug[idx] ||
      item.managementPlan.redFlags[idx] ||
      item.managementPlan.disposition;
    return {
      id: actId,
      category: actId.includes('med') || actId.includes('aspirin') || actId.includes('heparin') || actId.includes('urapidil')
        ? 'medication'
        : 'recommendation',
      label: rawLabel,
    };
  });

  const dangerousOptionItems: ManagementOption[] = item.dangerousActions.map((actId) => {
    const found = COMMON_DISTRACTORS.find((d) => d.id === actId);
    if (found) return found;
    return {
      id: actId,
      category: actId.includes('discharge') ? 'disposition' : 'medication',
      label: { ru: `Опасное действие: ${actId}`, kk: `Қауіпті әрекет: ${actId}`, en: `Dangerous action: ${actId}` },
    };
  });

  const distractorOptions = COMMON_DISTRACTORS.filter(
    (d) => !item.expectedActions.includes(d.id) && !item.dangerousActions.includes(d.id),
  );

  // Combine options so distractors are present alongside expected and dangerous actions
  const managementOptions: ManagementOption[] = [
    ...correctOptionItems,
    ...dangerousOptionItems,
    ...distractorOptions,
  ];

  return StudentCaseDTOSchema.parse({
    id: item.id,
    synthetic: item.synthetic,
    validationTier: item.validationTier,
    medicalReviewStatus: item.medicalReviewStatus,
    title: item.title,
    specialty: item.specialty,
    patient: item.patient,
    scene: item.scene,
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
