import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const body=await request.json();
  const base=process.env.RAG_SERVICE_URL;
  if (base) {
    try {
      const response=await fetch(`${base.replace(/\/$/,'')}/diagnose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      if (response.ok) return NextResponse.json(await response.json());
    } catch {}
  }
  return NextResponse.json(demoDiagnosis());
}

function demoDiagnosis(){
  return {case_id:'demo-vercel',diagnoses:[{rank:1,diagnosis:'Тяжелая преэклампсия',icd10_code:'O14.1',confidence:'high',why_this_diagnosis:'Беременность 34 недели, АД 170/110, головная боль, зрительные нарушения, боль в правом подреберье, повышение АЛТ/АСТ и тромбоцитопения соответствуют тяжелой преэклампсии. Протеинурия не указана и остается неизвестной.',supporting_findings:[{finding:'АД 170/110',patient_evidence:'Артериальное давление 170/110 мм рт. ст.'},{finding:'Неврологические симптомы',patient_evidence:'Сильная головная боль, мелькание мушек перед глазами'},{finding:'Печеночные признаки',patient_evidence:'Боль в правом подреберье, повышены АЛТ и АСТ'}],missing_findings:['Протеинурия не указана','Креатинин не указан']},{rank:2,diagnosis:'HELLP-синдром',icd10_code:'O14.2',confidence:'medium',why_this_diagnosis:'Повышенные АЛТ/АСТ и тромбоцитопения поддерживают HELLP, но гемолиз пока не подтвержден.',supporting_findings:[{finding:'Повышены АЛТ/АСТ',patient_evidence:'В анализах повышены АЛТ и АСТ'},{finding:'Тромбоцитопения',patient_evidence:'снижены тромбоциты'}],missing_findings:['ЛДГ, билирубин, гаптоглобин, шистоциты']},{rank:3,diagnosis:'Эклампсия во время беременности',icd10_code:'O15.0',confidence:'low',why_this_diagnosis:'Тяжелая преэклампсия может перейти в эклампсию, но судороги не указаны.',supporting_findings:[{finding:'Тяжелая гипертензия и неврологические симптомы',patient_evidence:'АД 170/110, головная боль, нарушения зрения'}],missing_findings:['Судороги не указаны']}],follow_up_questions:[{question:'Есть ли протеинурия или отношение белок/креатинин?',target_diagnoses:['O14.1'],rationale:'Критерий преэклампсии.'},{question:'Есть ли ЛДГ, билирубин, гаптоглобин или шистоциты?',target_diagnoses:['O14.2'],rationale:'Подтверждение гемолиза для HELLP.'},{question:'Были ли судороги?',target_diagnoses:['O15.0'],rationale:'Ключевой критерий эклампсии.'}]};
}
