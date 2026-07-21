import 'server-only';

import type { MedicalCase, LocalizedText } from '@/domain/schemas';
import { additionalSeeds } from './additional-cases.server';
import { caseDefinitions } from './case-definitions.server';

const t = (ru: string, kk: string, en: string): LocalizedText => ({ ru, kk, en });

type Seed = {
  id: string;
  specialty: string;
  name: [string, string, string];
  age: number;
  sex: 'male' | 'female';
  title: [string, string, string];
  complaint: [string, string, string];
  urgency: 'routine' | 'urgent' | 'emergency';
  difficulty: 'easy' | 'medium' | 'hard';
  diagnosis: [string, string, string, string];
  facts: [string, string, string, string][];
  vitals: [number, string, number, number, number];
};

const initialSeeds: Seed[] = [
  ['chest-pain','cardiology',['Арман Сагинов','Арман Сағынов','Arman Saginov'],46,'male',['Боль в груди','Кеуде ауыруы','Chest pain'],['Давящая боль за грудиной','Төс артындағы қысып ауыру','Pressure behind the sternum'],'emergency','hard',['I20.0','Нестабильная стенокардия','Тұрақсыз стенокардия','Unstable angina'],[['onset','Началось 40 минут назад','40 минут бұрын басталды','Started 40 minutes ago'],['radiation','Отдаёт в левую руку','Сол қолға тарайды','Radiates to the left arm'],['risk','Курит 20 лет','20 жыл темекі шегеді','Smokes for 20 years']], [104,'150/92',22,36.7,94]],
  ['hypertensive-crisis','cardiology',['Сауле Мусина','Сәуле Мусина','Saule Musina'],58,'female',['Высокое давление','Жоғары қысым','High blood pressure'],['Головная боль и мелькание мушек','Бас ауыруы және көз алдында дақтар','Headache and flashing spots'],'urgent','medium',['I16.0','Гипертонический криз','Гипертониялық криз','Hypertensive crisis'],[['adherence','Пропустила препараты два дня','Дәрілерді екі күн ішпеді','Missed medication for two days'],['neuro','Слабости в конечностях нет','Аяқ-қол әлсіздігі жоқ','No limb weakness']], [96,'210/118',20,36.6,97]],
  ['pneumonia','pulmonology',['Сергей Ахметов','Сергей Ахметов','Sergey Akhmetov'],45,'male',['Лихорадка и кашель','Қызба және жөтел','Fever and cough'],['Кашель с мокротой четыре дня','Төрт күн қақырықты жөтел','Productive cough for four days'],'urgent','medium',['J18.9','Внебольничная пневмония','Қауымдастықтан тыс пневмония','Community-acquired pneumonia'],[['sputum','Мокрота желтоватая','Қақырық сарғыш','Yellowish sputum'],['dyspnea','Одышка при ходьбе','Жүргенде ентігу','Dyspnea on walking']], [108,'128/78',26,39.1,91]],
  ['asthma','pulmonology',['Алия Сейдахмет','Әлия Сейдахмет','Aliya Seidakhmet'],23,'female',['Свистящее дыхание','Ысқырықты тыныс','Wheezing'],['Нарастающая одышка после контакта с кошкой','Мысықпен қатынастан кейін ентігу','Worsening dyspnea after cat exposure'],'emergency','medium',['J45.901','Обострение бронхиальной астмы','Бронх демікпесінің өршуі','Asthma exacerbation'],[['trigger','Гостила в доме с кошкой','Мысығы бар үйде болды','Visited a home with a cat'],['speech','Говорит короткими фразами','Қысқа сөйлемдермен сөйлейді','Speaks in short phrases']], [122,'132/84',30,37,89]],
  ['hypoglycemia','endocrinology',['Нурлан Тлеуов','Нұрлан Тілеуов','Nurlan Tleuov'],61,'male',['Потливость и спутанность','Терлеу және сананың шатасуы','Sweating and confusion'],['Внезапная слабость перед обедом','Түскі асқа дейін кенет әлсіздік','Sudden weakness before lunch'],'emergency','easy',['E16.2','Гипогликемия','Гипогликемия','Hypoglycemia'],[['meal','Не завтракал после инсулина','Инсулиннен кейін таңғы ас ішпеді','Skipped breakfast after insulin'],['tremor','Есть дрожь в руках','Қолдары дірілдейді','Hands are trembling']], [112,'118/72',20,36.4,98]],
  ['dka','endocrinology',['Дана Омарова','Дана Омарова','Dana Omarova'],19,'female',['Жажда и слабость','Шөлдеу және әлсіздік','Thirst and weakness'],['Рвота, частое мочеиспускание','Құсу, жиі зәр шығару','Vomiting and frequent urination'],'emergency','hard',['E10.1','Диабетический кетоацидоз','Диабеттік кетоацидоз','Diabetic ketoacidosis'],[['insulin','Пропустила инсулин на фоне ОРВИ','ЖРВИ кезінде инсулинді жіберіп алды','Missed insulin during a viral illness'],['breath','Глубокое частое дыхание','Терең жиі тыныс','Deep rapid breathing']], [126,'96/62',30,38,96]],
  ['appendicitis','gastroenterology',['Ермек Байжанов','Ермек Байжанов','Yermek Baizhanov'],27,'male',['Боль в животе','Іштің ауыруы','Abdominal pain'],['Боль сместилась в правую нижнюю часть живота','Ауырсыну іштің оң төменгі бөлігіне ауысты','Pain migrated to right lower abdomen'],'urgent','medium',['K35.8','Острый аппендицит','Жедел аппендицит','Acute appendicitis'],[['migration','Началось около пупка','Кіндік маңында басталды','Started around the umbilicus'],['appetite','Аппетита нет','Тәбеті жоқ','No appetite']], [102,'122/76',21,38.1,98]],
  ['pyelonephritis','therapy',['Мадина Касымова','Мәдина Қасымова','Madina Kasymova'],34,'female',['Боль в пояснице и жар','Бел ауыруы және қызба','Flank pain and fever'],['Боль справа, озноб, частое мочеиспускание','Оң жақ ауырады, қалтырау, жиі зәр шығару','Right flank pain, chills and frequency'],'urgent','medium',['N10','Острый пиелонефрит','Жедел пиелонефрит','Acute pyelonephritis'],[['urine','Резь при мочеиспускании','Зәр шығарғанда ашиды','Dysuria'],['pregnancy','Беременность отрицает','Жүктілікті жоққа шығарады','Denies pregnancy']], [110,'108/68',22,39,97]],
  ['tia','neurology',['Самат Айтуганов','Самат Айтуғанов','Samat Aituganov'],67,'male',['Слабость в руке','Қолдың әлсіздігі','Arm weakness'],['Правая рука ослабла на 15 минут','Оң қолы 15 минут әлсіреді','Right arm was weak for 15 minutes'],'emergency','hard',['G45.9','Транзиторная ишемическая атака','Өтпелі ишемиялық шабуыл','Transient ischemic attack'],[['speech','Жена заметила невнятную речь','Жұбайы анық емес сөйлеуді байқады','Wife noticed slurred speech'],['resolved','Сейчас симптомы прошли','Қазір белгілер өтті','Symptoms have resolved']], [88,'172/96',18,36.5,97]],
  ['anaphylaxis','emergency',['Айша Нурбек','Айша Нұрбек','Aisha Nurbek'],31,'female',['Отёк губ и удушье','Ерін ісінуі және тұншығу','Lip swelling and choking'],['Стало трудно дышать после антибиотика','Антибиотиктен кейін тыныс қиындады','Breathing difficulty after antibiotic'],'emergency','hard',['T78.2','Анафилаксия','Анафилаксия','Anaphylaxis'],[['exposure','Приняла первую таблетку амоксициллина','Амоксициллиннің алғашқы таблеткасын ішті','Took first amoxicillin tablet'],['skin','По телу зудящие волдыри','Денеде қышитын күлдіреуіктер','Itchy hives over body']], [132,'82/48',32,36.8,86]],
  ['anemia','therapy',['Жанар Абдрахман','Жанар Абдрахман','Zhanar Abdrakhman'],39,'female',['Усталость','Шаршау','Fatigue'],['Слабость и одышка последние месяцы','Соңғы айларда әлсіздік пен ентігу','Weakness and dyspnea for months'],'routine','easy',['D50.9','Железодефицитная анемия','Темір тапшылығы анемиясы','Iron deficiency anemia'],[['menses','Менструации обильные','Етеккірі мол','Heavy periods'],['diet','Мясо ест редко','Етті сирек жейді','Rarely eats meat']], [92,'108/66',18,36.5,99]],
  ['migraine','neurology',['Асель Токтарова','Әсел Тоқтарова','Assel Toktarova'],29,'female',['Односторонняя головная боль','Біржақты бас ауыруы','Unilateral headache'],['Пульсирующая боль с тошнотой','Жүрек айнумен соғатын ауырсыну','Throbbing pain with nausea'],'routine','easy',['G43.0','Мигрень без ауры','Аурасыз мигрень','Migraine without aura'],[['light','Свет усиливает боль','Жарық ауырсынуды күшейтеді','Light worsens pain'],['episodes','Похожие приступы бывали','Ұқсас ұстамалар болған','Similar attacks occurred']], [80,'116/74',16,36.6,99]],
  ['gerd','gastroenterology',['Руслан Абилов','Руслан Әбілов','Ruslan Abilov'],42,'male',['Изжога','Қыжыл','Heartburn'],['Жжение после еды и в положении лёжа','Тамақтан соң және жатқанда күйдіру','Burning after meals and lying down'],'routine','easy',['K21.9','Гастроэзофагеальная рефлюксная болезнь','Гастроэзофагеалды рефлюкс ауруы','Gastroesophageal reflux disease'],[['food','Хуже после жирной пищи','Майлы тамақтан кейін нашар','Worse after fatty meals'],['alarm','Похудения и дисфагии нет','Салмақ жоғалту мен дисфагия жоқ','No weight loss or dysphagia']], [76,'124/78',16,36.6,99]],
  ['viral-uri','infectious',['Тимур Оспанов','Тимур Оспанов','Timur Ospanov'],25,'male',['Насморк и боль в горле','Мұрыннан су ағу және тамақ ауыруы','Runny nose and sore throat'],['Третий день насморк, кашель и слабость','Үшінші күн мұрыннан су ағып, жөтел және әлсіздік','Three days of coryza, cough and fatigue'],'routine','easy',['J06.9','Острая вирусная инфекция верхних дыхательных путей','Жоғарғы тыныс жолдарының жедел вирустық инфекциясы','Acute viral upper respiratory infection'],[['duration','Болеет три дня','Үш күн ауырады','Ill for three days'],['antibiotics','Просит назначить антибиотик','Антибиотик тағайындауды сұрайды','Asks for an antibiotic']], [84,'120/74',18,37.4,98]],
  ['preeclampsia','emergency',['Гульмира Садыкова','Гүлмира Садықова','Gulmira Sadykova'],32,'female',['Головная боль при беременности','Жүктілік кезіндегі бас ауыруы','Headache in pregnancy'],['Сильная головная боль и отёки на 34 неделе','34 аптада қатты бас ауыруы және ісіну','Severe headache and edema at 34 weeks'],'emergency','hard',['O14.1','Тяжёлая преэклампсия','Ауыр преэклампсия','Severe preeclampsia'],[['vision','Перед глазами вспышки','Көз алдында жарқылдар','Flashes before eyes'],['epigastric','Боль в эпигастрии','Эпигастрий ауырады','Epigastric pain']], [94,'174/112',20,36.7,97]]
].map((x) => ({
  id: x[0],
  specialty: x[1],
  name: x[2],
  age: x[3],
  sex: x[4],
  title: x[5],
  complaint: x[6],
  urgency: x[7],
  difficulty: x[8],
  diagnosis: x[9],
  facts: x[10],
  vitals: x[11]
} as Seed));

// Combine all 32 seed cases
const allSeeds: Seed[] = [...initialSeeds, ...additionalSeeds];

export const cases: MedicalCase[] = allSeeds.map((s) => {
  const caseDef = caseDefinitions[s.id];
  if (!caseDef) {
    throw new Error(`Missing caseDefinition for caseId: "${s.id}"`);
  }

  return {
    id: s.id,
    synthetic: true as const,
    validationTier: 'beta' as const,
    medicalReviewStatus: 'unreviewed' as const,
    title: t(...s.title),
    specialty: s.specialty,
    patient: {
      name: t(...s.name),
      age: s.age,
      sex: s.sex,
      avatar: `/patients/${s.id}/portrait.svg`,
    },
    complaint: t(...s.complaint),
    urgency: s.urgency,
    difficulty: s.difficulty,
    durationMinutes: s.difficulty === 'hard' ? 25 : s.difficulty === 'medium' ? 18 : 12,
    visualStates: ['neutral', 'thinking', 'speaking', 'pain', 'relieved'],
    vitals: {
      heartRate: s.vitals[0],
      bloodPressure: s.vitals[1],
      respiratoryRate: s.vitals[2],
      temperature: s.vitals[3],
      spo2: s.vitals[4],
      ...(s.id === 'hypoglycemia' ? { glucose: 2.4 } : {}),
    },
    hiddenFacts: s.facts.map((f, i) => ({
      id: `${s.id}-fact-${i}`,
      intent: f[0],
      value: t(f[1], f[2], f[3]),
      unlockKeywords: i === 0 ? ['когда', 'начал', 'бастал', 'when', 'history', 'анамнез'] : ['ещё', 'тағы', 'other', 'риск', 'risk', 'симптом'],
      visualState: i === 0 ? 'speaking' : 'thinking',
      critical: s.urgency === 'emergency',
    })),
    examinations: caseDef.examinations,
    investigations: caseDef.investigations,
    differentials: caseDef.differentials,
    correctDiagnosis: caseDef.correctDiagnosis,
    managementPlan: caseDef.managementPlan,
    expectedActions: caseDef.expectedActions,
    dangerousActions: caseDef.dangerousActions,
    scoringRubric: caseDef.scoringRubric,
  };
});
