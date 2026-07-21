import { z } from 'zod';

export const LocaleSchema = z.enum(['ru', 'kk', 'en']);
export const LocalizedTextSchema = z.object({ ru: z.string(), kk: z.string().optional(), en: z.string().optional() });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const PatientVisualStateSchema = z.enum([
  'neutral',
  'listening',
  'thinking',
  'speaking',
  'coughing',
  'pain',
  'dyspnea',
  'anxious',
  'dizzy',
  'relieved',
  'deteriorating',
  'emergency',
  'distressed',
]);
export type PatientVisualState = z.infer<typeof PatientVisualStateSchema>;

export const VitalSignsSchema = z.object({
  heartRate: z.number(),
  bloodPressure: z.string(),
  respiratoryRate: z.number(),
  temperature: z.number(),
  spo2: z.number(),
  glucose: z.number().optional(),
});
export type VitalSigns = z.infer<typeof VitalSignsSchema>;

export const HiddenFactSchema = z.object({
  id: z.string(),
  intent: z.string(),
  value: LocalizedTextSchema,
  unlockKeywords: z.array(z.string()),
  visualState: PatientVisualStateSchema.optional(),
  critical: z.boolean().default(false),
});
export type HiddenFact = z.infer<typeof HiddenFactSchema>;

export const ExaminationFindingSchema = z.object({
  id: z.string(),
  category: z.enum(['general', 'auscultation', 'palpation', 'percussion', 'neurological', 'cardiovascular', 'respiratory', 'abdominal']),
  label: LocalizedTextSchema,
  result: LocalizedTextSchema,
  relevant: z.boolean(),
});
export type ExaminationFinding = z.infer<typeof ExaminationFindingSchema>;

export const StudentExaminationDTOSchema = ExaminationFindingSchema.pick({
  id: true,
  category: true,
  label: true,
});
export type StudentExaminationDTO = z.infer<typeof StudentExaminationDTOSchema>;

export const InvestigationSchema = z.object({
  id: z.string(),
  category: z.enum(['laboratory', 'imaging', 'functional']),
  name: LocalizedTextSchema,
  result: LocalizedTextSchema,
  cost: z.number().int().nonnegative(),
  delayMs: z.number().int().nonnegative(),
  indicated: z.boolean(),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

export const StudentInvestigationDTOSchema = InvestigationSchema.pick({
  id: true,
  category: true,
  name: true,
  cost: true,
  delayMs: true,
});
export type StudentInvestigationDTO = z.infer<typeof StudentInvestigationDTOSchema>;

export const DifferentialDiagnosisSchema = z.object({
  code: z.string(),
  name: LocalizedTextSchema,
  required: z.boolean().optional(),
});
export type DifferentialDiagnosis = z.infer<typeof DifferentialDiagnosisSchema>;

export const StudentDifferentialDTOSchema = DifferentialDiagnosisSchema.pick({
  code: true,
  name: true,
});
export type StudentDifferentialDTO = z.infer<typeof StudentDifferentialDTOSchema>;

export const ManagementPlanSchema = z.object({
  recommendations: z.array(LocalizedTextSchema),
  medications: z.array(LocalizedTextSchema),
  nonDrug: z.array(LocalizedTextSchema),
  disposition: LocalizedTextSchema,
  followUp: LocalizedTextSchema,
  redFlags: z.array(LocalizedTextSchema),
});
export type ManagementPlan = z.infer<typeof ManagementPlanSchema>;

export const ManagementOptionSchema = z.object({
  id: z.string(),
  category: z.enum(['recommendation', 'medication', 'nonDrug', 'disposition', 'redFlag']),
  label: LocalizedTextSchema,
});
export type ManagementOption = z.infer<typeof ManagementOptionSchema>;

export const ScoringRubricSchema = z.object({
  history: z.number(),
  examination: z.number(),
  investigations: z.number(),
  differential: z.number(),
  diagnosis: z.number(),
  management: z.number(),
  communication: z.number(),
  critical: z.number(),
});
export type ScoringRubric = z.infer<typeof ScoringRubricSchema>;

export const MedicalCaseSchema = z.object({
  id: z.string(),
  synthetic: z.literal(true),
  medicalReviewStatus: z.literal('unreviewed'),
  title: LocalizedTextSchema,
  specialty: z.string(),
  patient: z.object({
    name: LocalizedTextSchema,
    age: z.number().int().positive(),
    sex: z.enum(['male', 'female']),
    avatar: z.string(),
  }),
  complaint: LocalizedTextSchema,
  urgency: z.enum(['routine', 'urgent', 'emergency']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  durationMinutes: z.number().int().positive(),
  visualStates: z.array(PatientVisualStateSchema),
  vitals: VitalSignsSchema,
  hiddenFacts: z.array(HiddenFactSchema),
  examinations: z.array(ExaminationFindingSchema),
  investigations: z.array(InvestigationSchema),
  differentials: z.array(DifferentialDiagnosisSchema),
  correctDiagnosis: DifferentialDiagnosisSchema,
  managementPlan: ManagementPlanSchema,
  expectedActions: z.array(z.string()),
  dangerousActions: z.array(z.string()),
  scoringRubric: ScoringRubricSchema,
});
export type MedicalCase = z.infer<typeof MedicalCaseSchema>;
export type CaseDefinition = Pick<
  MedicalCase,
  | 'correctDiagnosis'
  | 'differentials'
  | 'examinations'
  | 'investigations'
  | 'managementPlan'
  | 'expectedActions'
  | 'dangerousActions'
  | 'scoringRubric'
>;

export const LocalizedMedicalCaseSchema = MedicalCaseSchema.extend({ locale: LocaleSchema });
export type LocalizedMedicalCase = z.infer<typeof LocalizedMedicalCaseSchema>;

export const StudentCaseDTOSchema = z.object({
  id: z.string(),
  synthetic: z.literal(true),
  medicalReviewStatus: z.literal('unreviewed'),
  title: LocalizedTextSchema,
  specialty: z.string(),
  patient: z.object({
    name: LocalizedTextSchema,
    age: z.number().int().positive(),
    sex: z.enum(['male', 'female']),
    avatar: z.string(),
  }),
  complaint: LocalizedTextSchema,
  urgency: z.enum(['routine', 'urgent', 'emergency']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  durationMinutes: z.number().int().positive(),
  visualStates: z.array(PatientVisualStateSchema),
  vitals: VitalSignsSchema,
  examinations: z.array(StudentExaminationDTOSchema),
  investigations: z.array(StudentInvestigationDTOSchema),
  differentials: z.array(StudentDifferentialDTOSchema),
  managementOptions: z.array(ManagementOptionSchema),
});
export type StudentCaseDTO = z.infer<typeof StudentCaseDTOSchema>;

export const StudentActionSchema = z.object({
  id: z.string(),
  type: z.enum(['question', 'examination', 'investigation', 'differential', 'diagnosis', 'management', 'communication']),
  value: z.string(),
  timestamp: z.number(),
});
export type StudentAction = z.infer<typeof StudentActionSchema>;

export const DialogueMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['student', 'patient']),
  text: z.string(),
  timestamp: z.number(),
  visualState: PatientVisualStateSchema.optional(),
});
export type DialogueMessage = z.infer<typeof DialogueMessageSchema>;

export const PerformedExaminationSchema = z.object({
  id: z.string(),
  result: z.string(),
  performedAt: z.number(),
});
export type PerformedExamination = z.infer<typeof PerformedExaminationSchema>;

export const OrderedInvestigationSchema = z.object({
  id: z.string(),
  orderedAt: z.number(),
  readyAt: z.number(),
  result: z.string(),
  status: z.enum(['pending', 'ready', 'failed']),
});
export type OrderedInvestigation = z.infer<typeof OrderedInvestigationSchema>;

export const TrainingSessionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  stage: z.number().int().min(0).max(7),
  revealedFactIds: z.array(z.string()),
  actions: z.array(StudentActionSchema),
  dialogue: z.array(DialogueMessageSchema).default([]),
  performedExaminations: z.array(PerformedExaminationSchema).default([]),
  orderedInvestigations: z.array(OrderedInvestigationSchema).default([]),
  selectedInvestigations: z.array(z.string()),
  differentials: z.array(z.string()),
  finalDiagnosis: z.string().optional(),
  clinicalReasoning: z.string(),
  managementNotes: z.string(),
});
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const DebriefReferenceSchema = z.object({
  title: z.string(),
  status: z.enum(['rag-ready', 'rag-unavailable', 'rag-pending']),
  excerpt: z.string().optional(),
  protocolId: z.string().optional(),
});
export type DebriefReference = z.infer<typeof DebriefReferenceSchema>;

export const DebriefResultSchema = z.object({
  caseId: z.string(),
  total: z.number().min(0).max(100),
  categories: z.record(z.string(), z.number()),
  missedQuestions: z.array(z.string()),
  foundRedFlags: z.array(z.string()),
  missedRedFlags: z.array(z.string()),
  investigationFeedback: z.array(z.string()),
  criticalErrors: z.array(z.string()),
  strengths: z.array(z.string()),
  recommendations: z.array(z.string()),
  timeline: z.array(StudentActionSchema),
  referencePlaceholders: z.array(DebriefReferenceSchema),
  correctDiagnosis: z.string(),
});
export type DebriefResult = z.infer<typeof DebriefResultSchema>;
