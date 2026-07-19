import {z} from 'zod';
export const RagCitationSchema=z.object({id:z.string(),title:z.string(),url:z.string().url().optional(),publisher:z.string().optional(),reviewedAt:z.string().optional(),excerpt:z.string().optional()});
export const RagRequestSchema=z.object({caseId:z.string(),locale:z.enum(['ru','kk','en']),task:z.enum(['patient-response','debrief-evidence','management-validation']),query:z.string(),allowedFactIds:z.array(z.string()).default([])});
export const RagResponseSchema=z.object({content:z.string(),citations:z.array(RagCitationSchema),confidence:z.number().min(0).max(1),requiresHumanReview:z.boolean()});
export interface MedicalRagAdapter { query(input:z.infer<typeof RagRequestSchema>):Promise<z.infer<typeof RagResponseSchema>>; }
