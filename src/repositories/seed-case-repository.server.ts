import 'server-only';
import {cases} from '@/data/cases.server';
import {StudentCaseDTOSchema, type StudentCaseDTO} from '@/domain/schemas';
import type {CaseRepository} from './case-repository';
const safe=(item:(typeof cases)[number]):StudentCaseDTO=>({...StudentCaseDTOSchema.parse(item),examinations:item.examinations.filter(x=>x.relevant)});
export class SeedCaseRepository implements CaseRepository {async listStudentCases(){return cases.map(safe)} async getStudentCase(id:string){const found=cases.find(x=>x.id===id);return found?safe(found):null} async getGroundTruth(id:string){return cases.find(x=>x.id===id)??null}}
