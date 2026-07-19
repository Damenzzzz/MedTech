import type {MedicalCase, StudentCaseDTO} from '@/domain/schemas';
export interface CaseRepository { listStudentCases():Promise<StudentCaseDTO[]>; getStudentCase(id:string):Promise<StudentCaseDTO|null>; getGroundTruth(id:string):Promise<MedicalCase|null>; }
