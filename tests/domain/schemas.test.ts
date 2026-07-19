import {describe,expect,it} from 'vitest';
import {StudentCaseDTOSchema,TrainingSessionSchema} from '@/domain/schemas';

describe('public medical contracts',()=>{
 it('strips server-only ground truth from a student case',()=>{const parsed=StudentCaseDTOSchema.parse({id:'case',synthetic:true,medicalReviewStatus:'unreviewed',title:{ru:'Случай'},specialty:'therapy',patient:{name:{ru:'Пациент'},age:40,sex:'male',avatar:'/avatar.png'},complaint:{ru:'Жалоба'},urgency:'routine',difficulty:'easy',durationMinutes:10,visualStates:['neutral'],vitals:{heartRate:80,bloodPressure:'120/80',respiratoryRate:16,temperature:36.6,spo2:99},examinations:[],investigations:[],differentials:[],hiddenFacts:[{id:'secret'}],correctDiagnosis:{code:'SECRET'},scoringRubric:{history:100}});expect(parsed).not.toHaveProperty('hiddenFacts');expect(parsed).not.toHaveProperty('correctDiagnosis');expect(parsed).not.toHaveProperty('scoringRubric')});
 it('rejects incomplete training sessions',()=>{expect(()=>TrainingSessionSchema.parse({caseId:'x'})).toThrow()});
});
