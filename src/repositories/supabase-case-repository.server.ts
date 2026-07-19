import 'server-only';
import type {CaseRepository} from './case-repository';
import type {MedicalCase,StudentCaseDTO} from '@/domain/schemas';
export class SupabaseCaseRepository implements CaseRepository {
 constructor(){throw new Error('Supabase adapter is not configured. Use CASE_REPOSITORY=seed for demo.');}
 async listStudentCases():Promise<StudentCaseDTO[]>{return []}
 async getStudentCase(_id:string):Promise<StudentCaseDTO|null>{return null}
 async getGroundTruth(_id:string):Promise<MedicalCase|null>{return null}
}
