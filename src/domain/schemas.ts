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

export const ValidationTierSchema = z.enum(['core', 'beta']);
export type ValidationTier = z.infer<typeof ValidationTierSchema>;

export const MedicalReviewStatusSchema = z.enum(['unreviewed', 'reviewed']);
export type MedicalReviewStatus = z.infer<typeof MedicalReviewStatusSchema>;

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
  validationTier: ValidationTierSchema.default('beta'),
  medicalReviewStatus: MedicalReviewStatusSchema.default('unreviewed'),
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
  validationTier: ValidationTierSchema.default('beta'),
  medicalReviewStatus: MedicalReviewStatusSchema.default('unreviewed'),
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
  selectedManagementOptionIds: z.array(z.string()).default([]),
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

// STT Response Schemas
export const SttSpeakerSchema = z.enum(['doctor', 'patient', 'relative', 'nurse', 'unknown']);
export type SttSpeaker = z.infer<typeof SttSpeakerSchema>;

export const SttTurnSchema = z.object({
  speaker: SttSpeakerSchema,
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
});
export type SttTurn = z.infer<typeof SttTurnSchema>;

export const SttResponseSchema = z.object({
  transcriptId: z.string(),
  text: z.string(),
  turns: z.array(SttTurnSchema),
  language: z.enum(['ru', 'kk', 'en', 'unknown']),
  durationSeconds: z.number(),
  provider: z.enum(['openai', 'mock']),
  model: z.string(),
  requestId: z.string(),
});
export type SttResponse = z.infer<typeof SttResponseSchema>;

// Encounter Protocol Schemas for Medical STT -> AlemLLM Workflow
export const ProtocolSourceItemSchema = z.object({
  text: z.string(),
  sourceQuotes: z.array(z.string()).default([]),
});
export type ProtocolSourceItem = z.infer<typeof ProtocolSourceItemSchema>;

export const VitalSignItemSchema = z.object({
  name: z.string(),
  value: z.string(),
  sourceQuote: z.string().optional(),
});
export type VitalSignItem = z.infer<typeof VitalSignItemSchema>;

export const PreliminaryDiagnosisSchema = z.object({
  diagnosis: z.string().nullable().default(null),
  icd10Code: z.string().nullable().default(null),
  sourceQuotes: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export const DifferentialDiagnosisItemSchema = z.object({
  diagnosis: z.string(),
  icd10Code: z.string().nullable().default(null),
  supportingEvidence: z.array(z.string()).default([]),
  missingEvidence: z.array(z.string()).default([]),
});

export const ProtocolAssessmentSchema = z.object({
  clinicalSummary: z.string().default(''),
  preliminaryDiagnosis: PreliminaryDiagnosisSchema.default({ diagnosis: null, icd10Code: null, sourceQuotes: [], uncertainties: [] }),
  differentialDiagnoses: z.array(DifferentialDiagnosisItemSchema).default([]),
});

export const ProtocolPlanSchema = z.object({
  investigations: z.array(z.string()).default([]),
  treatmentDraft: z.array(z.string()).default([]),
  referrals: z.array(z.string()).default([]),
  followUp: z.array(z.string()).default([]),
  safetyNetting: z.array(z.string()).default([]),
});

export const ProtocolSectionsSchema = z.object({
  chiefComplaints: z.array(ProtocolSourceItemSchema).default([]),
  historyOfPresentIllness: ProtocolSourceItemSchema.default({ text: '', sourceQuotes: [] }),
  pastMedicalHistory: z.array(ProtocolSourceItemSchema).default([]),
  medications: z.array(ProtocolSourceItemSchema).default([]),
  allergies: z.array(ProtocolSourceItemSchema).default([]),
  objectiveFindings: z.array(ProtocolSourceItemSchema).default([]),
  vitalSigns: z.array(VitalSignItemSchema).default([]),
  redFlags: z.array(ProtocolSourceItemSchema).default([]),
  assessment: ProtocolAssessmentSchema.default({ clinicalSummary: '', preliminaryDiagnosis: { diagnosis: null, icd10Code: null, sourceQuotes: [], uncertainties: [] }, differentialDiagnoses: [] }),
  plan: ProtocolPlanSchema.default({ investigations: [], treatmentDraft: [], referrals: [], followUp: [], safetyNetting: [] }),
  unresolvedQuestions: z.array(z.string()).default([]),
});

export const ProtocolProvenanceSchema = z.object({
  transcriptionProvider: z.string(),
  transcriptionModel: z.string(),
  generationProvider: z.string(),
  generationModel: z.string(),
  generatedAt: z.string(),
});

export const ProtocolHistoryEntrySchema = z.object({
  version: z.number(),
  createdAt: z.string(),
  source: z.enum(['ai', 'physician-edit']),
});

export const EncounterProtocolSchema = z.object({
  protocolId: z.string(),
  status: z.enum(['draft', 'edited', 'reviewed']).default('draft'),
  locale: LocaleSchema.default('ru'),
  sections: ProtocolSectionsSchema,
  provenance: ProtocolProvenanceSchema,
  warning: z.string().default('Черновик создан AI и требует проверки и утверждения врачом.'),
  version: z.number().default(1),
  history: z.array(ProtocolHistoryEntrySchema).default([]),
});
export type EncounterProtocol = z.infer<typeof EncounterProtocolSchema>;

export const EncounterProtocolRequestSchema = z.object({
  transcriptId: z.string().min(1),
  transcriptText: z.string(),
  turns: z.array(z.object({
    speaker: z.enum(['doctor', 'patient', 'relative', 'nurse', 'unknown']),
    text: z.string(),
    start: z.number().optional(),
    end: z.number().optional(),
  })).default([]),
  locale: LocaleSchema.default('ru'),
  encounterContext: z.object({
    patientAge: z.number().nullable().optional(),
    patientSex: z.enum(['male', 'female']).nullable().optional(),
    department: z.string().nullable().optional(),
  }).optional(),
  regenerate: z.boolean().default(false),
});
export type EncounterProtocolRequest = z.infer<typeof EncounterProtocolRequestSchema>;

// Stage 3 RAG & Clinical Rationale Schemas
export const ClinicalRationaleFactSchema = z.object({
  fact: z.string(),
  patient_evidence: z.string(),
});
export type ClinicalRationaleFact = z.infer<typeof ClinicalRationaleFactSchema>;

export const ClinicalRationaleSchema = z.object({
  summary: z.string(),
  supporting_patient_facts: z.array(ClinicalRationaleFactSchema).default([]),
  missing_or_conflicting_facts: z.array(z.string()).default([]),
  why_this_rank: z.string().default(''),
  next_discriminator: z.string().default(''),
  source_ids: z.array(z.string()).default([]),
});
export type ClinicalRationale = z.infer<typeof ClinicalRationaleSchema>;

export const DiagnosisItemSchema = z.object({
  rank: z.number(),
  diagnosis: z.string(),
  icd10_code: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  why_this_diagnosis: z.string().optional(),
  clinical_rationale: ClinicalRationaleSchema.optional(),
  supporting_findings: z.array(z.object({
    finding: z.string(),
    patient_evidence: z.string().optional(),
  })).optional(),
  missing_findings: z.array(z.string()).optional(),
  recommended_checks: z.array(z.string()).optional(),
});
export type DiagnosisItem = z.infer<typeof DiagnosisItemSchema>;

export const ProtocolSourceSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  protocolId: z.string().optional(),
  excerpt: z.string().optional(),
  url: z.string().optional(),
});
export type ProtocolSource = z.infer<typeof ProtocolSourceSchema>;

export const RagStatusSchema = z.enum(['rag-ready', 'rag-empty', 'fallback', 'unavailable']);
export type RagStatus = z.infer<typeof RagStatusSchema>;

export const DiagnoseResponseSchema = z.object({
  case_id: z.string(),
  diagnoses: z.array(DiagnosisItemSchema).default([]),
  sources: z.array(ProtocolSourceSchema).default([]),
  follow_up_questions: z.array(z.object({
    question: z.string(),
    target_diagnoses: z.array(z.string()).optional(),
    rationale: z.string().optional(),
  })).default([]),
  rag_status: RagStatusSchema.default('fallback'),
  cached_context: z.boolean().default(false),
  interaction_count: z.number().default(1),
  generation_provider: z.enum(['alem', 'mock']).default('alem'),
  request_id: z.string().optional(),
});
export type DiagnoseResponse = z.infer<typeof DiagnoseResponseSchema>;

export const RefineInputSchema = z.object({
  case_id: z.string().trim().optional(),
  additional_info: z.string().trim().max(3000).default(''),
  symptoms: z.string().trim().max(5000).default(''),
  locale: LocaleSchema.optional().default('ru'),
});
export type RefineInput = z.infer<typeof RefineInputSchema>;


