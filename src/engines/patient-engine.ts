import {z} from 'zod';
import {PatientVisualStateSchema} from '@/domain/schemas';
export const PatientMessageInputSchema=z.object({caseId:z.string(),message:z.string().trim().min(2).max(500),locale:z.enum(['ru','kk','en']),revealedFactIds:z.array(z.string()).default([])});
export type PatientMessageInput=z.infer<typeof PatientMessageInputSchema>;
export const PatientMessageResultSchema=z.object({answer:z.string(),intent:z.string(),revealedFactIds:z.array(z.string()),newFactIds:z.array(z.string()),visualState:PatientVisualStateSchema});
export type PatientMessageResult=z.infer<typeof PatientMessageResultSchema>;
export interface PatientEngine {respond(input:PatientMessageInput):Promise<PatientMessageResult>}
