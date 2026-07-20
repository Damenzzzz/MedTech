export type DemoRagSource={
  title:string;
  protocol_id:string;
  excerpt:string;
};

export type DemoRagResult={
  case_id:string;
  diagnoses:{
    rank:number;
    diagnosis:string;
    icd10_code:string;
    confidence:'high'|'medium'|'low';
    why_this_diagnosis:string;
    supporting_findings:{finding:string;patient_evidence:string}[];
    missing_findings:string[];
    recommended_checks:string[];
    sources?:DemoRagSource[];
  }[];
  follow_up_questions:{question:string;target_diagnoses:string[];rationale:string}[];
  sources:DemoRagSource[];
  cached_context?:boolean;
};

export function getDemoRagFallback(symptoms:string):DemoRagResult|null {
  const text=symptoms.toLowerCase();
  if (isCardiacEmergency(text)) return cardiacFallback(symptoms);
  if (isPreeclampsiaHellp(text)) return preeclampsiaFallback(symptoms);
  return null;
}

function isCardiacEmergency(text:string) {
  return /(за грудин|грудин|грудн|сердц|лев(ую|ой) рук|челюст|холодн.{0,12}пот|давящ|жгуч)/i.test(text)
    && /(боль|давит|одыш|пот|иррадиац|тошнот|страх|минут|час)/i.test(text);
}

function isPreeclampsiaHellp(text:string) {
  return /(беремен|недел|преэкламп|hellp|мушк|прав.{0,18}подреб|алт|аст|тромбоцит|170\/110|давлен)/i.test(text)
    && /(голов|зрен|отек|подреб|алт|аст|тромбоцит|170\/110|беремен)/i.test(text);
}

function has(symptoms:string, pattern:RegExp, fallback:string) {
  const match=symptoms.match(pattern);
  return match?.[0] ?? fallback;
}

function cardiacFallback(symptoms:string):DemoRagResult {
  const sources=[
    {
      title:'Острый коронарный синдром / инфаркт миокарда',
      protocol_id:'demo_kz_acs_protocol',
      excerpt:'При длительной загрудинной боли с иррадиацией, одышкой, холодным потом или тошнотой необходимо исключить ОКС: ЭКГ в 12 отведениях, тропонины в динамике, мониторинг и срочная маршрутизация.',
    },
    {
      title:'Стабильная и нестабильная стенокардия',
      protocol_id:'demo_kz_angina_protocol',
      excerpt:'Загрудинная давящая боль, связь с нагрузкой, иррадиация в руку или челюсть требуют дифференциации стенокардии и инфаркта; нестабильная картина требует срочной оценки.',
    },
    {
      title:'Расслоение аорты',
      protocol_id:'demo_kz_aortic_dissection_protocol',
      excerpt:'Внезапная интенсивная боль в груди или спине, асимметрия пульса, неврологические симптомы или нестабильность гемодинамики требуют исключения расслоения аорты.',
    },
  ];
  return {
    case_id:'demo-fallback-cardiac',
    cached_context:true,
    sources,
    diagnoses:[
      {
        rank:1,
        diagnosis:'Острый инфаркт миокарда / острый коронарный синдром',
        icd10_code:'I21.9',
        confidence:'high',
        why_this_diagnosis:'Давящая загрудинная боль длительностью более 20 минут с холодным потом, одышкой и иррадиацией в левую руку наиболее соответствует ОКС/инфаркту до исключения.',
        supporting_findings:[
          {finding:'давящая боль за грудиной',patient_evidence:has(symptoms,/давящ[а-я\s]{0,40}за грудин[а-я]*/i,'давящая боль за грудиной')},
          {finding:'длительность боли',patient_evidence:has(symptoms,/\d+\s*(минут|час)[а-я]*/i,'боль длится значимое время')},
          {finding:'холодный пот',patient_evidence:has(symptoms,/холодн[а-я\s]{0,12}пот/i,'холодный пот')},
          {finding:'одышка',patient_evidence:has(symptoms,/одышк[а-я]*/i,'одышка')},
          {finding:'иррадиация в левую руку',patient_evidence:has(symptoms,/иррадиац[а-я\s]{0,30}лев[а-я\s]{0,12}рук[а-я]*/i,'иррадиация в левую руку')},
        ],
        missing_findings:['ЭКГ в 12 отведениях: ST elevation/depression или другие ишемические изменения','тропонин I/T сейчас и в динамике','АД, пульс, SpO2, признаки шока','противопоказания к антиагрегантам/антикоагулянтам/нитратам'],
        recommended_checks:['ЭКГ немедленно, желательно в первые 10 минут','тропонины в динамике','мониторинг АД, ЧСС, SpO2','срочная маршрутизация в стационар с возможностью реперфузии'],
        sources:[sources[0],sources[1]],
      },
      {
        rank:2,
        diagnosis:'Нестабильная стенокардия',
        icd10_code:'I20.0',
        confidence:'medium',
        why_this_diagnosis:'Если ЭКГ и тропонины не подтверждают инфаркт, но боль длительная/новая/тяжелая, остается высокий риск нестабильной стенокардии.',
        supporting_findings:[
          {finding:'типичная ишемическая боль',patient_evidence:has(symptoms,/давящ[а-я\s]{0,40}за грудин[а-я]*/i,'давящая боль за грудиной')},
          {finding:'иррадиация',patient_evidence:has(symptoms,/лев[а-я\s]{0,12}рук[а-я]*/i,'в левую руку')},
        ],
        missing_findings:['результат ЭКГ','серийные тропонины','динамика боли после покоя/нитратов по протоколу'],
        recommended_checks:['не рассматривать как изжогу/паническую атаку до исключения ОКС','повторная ЭКГ при сохранении боли','оценка факторов риска'],
        sources:[sources[1]],
      },
      {
        rank:3,
        diagnosis:'Расслоение аорты, исключить при атипичной картине',
        icd10_code:'I71.0',
        confidence:'low',
        why_this_diagnosis:'Боль в груди может имитировать ОКС; нужно исключить, если боль внезапная разрывающая, иррадиирует в спину, есть асимметрия пульса, неврологический дефицит или шок.',
        supporting_findings:[
          {finding:'боль в грудной клетке',patient_evidence:has(symptoms,/боль[а-я\s]{0,30}(грудин|грудн)/i,'боль в грудной клетке')},
        ],
        missing_findings:['характер боли: разрывающая/мигрирующая в спину','разница АД/пульса на конечностях','неврологический дефицит','КТ-ангиография/ЭхоКГ по показаниям'],
        recommended_checks:['измерить АД на обеих руках','оценить пульс на конечностях','при подозрении срочная маршрутизация для визуализации'],
        sources:[sources[2]],
      },
    ],
    follow_up_questions:[
      {question:'Когда началась боль и сколько минут она длится?',target_diagnoses:['I21.9','I20.0'],rationale:'Длительность более 20 минут усиливает подозрение на инфаркт.'},
      {question:'Есть ли ЭКГ в 12 отведениях и тропонин?',target_diagnoses:['I21.9','I20.0'],rationale:'Это ключевые критерии подтверждения ОКС.'},
      {question:'Боль отдает в спину, есть разница давления на руках или слабость конечностей?',target_diagnoses:['I71.0'],rationale:'Это помогает не пропустить расслоение аорты.'},
    ],
  };
}

function preeclampsiaFallback(symptoms:string):DemoRagResult {
  const sources=[
    {
      title:'Тяжелая преэклампсия',
      protocol_id:'demo_kz_preeclampsia_protocol',
      excerpt:'АД 160/110 мм рт. ст. и выше, головная боль, зрительные нарушения, боль в эпигастрии/правом подреберье, повышение печеночных ферментов или тромбоцитопения требуют срочной акушерской тактики.',
    },
    {
      title:'HELLP-синдром',
      protocol_id:'demo_kz_hellp_protocol',
      excerpt:'HELLP требует оценки гемолиза, повышения печеночных ферментов и низких тромбоцитов; при неполных данных синдром следует исключать, а не утверждать окончательно.',
    },
    {
      title:'Гестационная гипертензия',
      protocol_id:'demo_kz_gestational_hypertension_protocol',
      excerpt:'Гестационная гипертензия является менее специфичным вариантом, если отсутствуют признаки тяжелой преэклампсии и органного поражения.',
    },
  ];
  return {
    case_id:'demo-fallback-preeclampsia',
    cached_context:true,
    sources,
    diagnoses:[
      {
        rank:1,
        diagnosis:'Тяжелая преэклампсия',
        icd10_code:'O14.1',
        confidence:'high',
        why_this_diagnosis:'АД 170/110, головная боль, зрительные нарушения, боль в правом подреберье, повышение АЛТ/АСТ и тромбоцитопения соответствуют тяжелой преэклампсии. Протеинурия не указана и должна быть уточнена.',
        supporting_findings:[
          {finding:'беременность 34 недели',patient_evidence:has(symptoms,/34\s*недел[а-я]*/i,'34 неделя беременности')},
          {finding:'АД 170/110',patient_evidence:has(symptoms,/170\/110/i,'АД 170/110')},
          {finding:'головная боль',patient_evidence:has(symptoms,/головн[а-я\s]{0,12}бол[а-я]*/i,'головная боль')},
          {finding:'зрительные нарушения',patient_evidence:has(symptoms,/(мушк[а-я\s]{0,24}глаз|наруш[а-я\s]{0,18}зрен)/i,'мелькание мушек перед глазами')},
          {finding:'боль в правом подреберье',patient_evidence:has(symptoms,/прав[а-я\s]{0,18}подребер[а-я]*/i,'боль в правом подреберье')},
          {finding:'повышение АЛТ/АСТ',patient_evidence:has(symptoms,/алт\s*и\s*аст|аст\s*и\s*алт|повышен[а-я\s]{0,24}алт[а-я\s]{0,12}аст/i,'повышены АЛТ и АСТ')},
          {finding:'тромбоцитопения',patient_evidence:has(symptoms,/тромбоцит[а-я\s]{0,30}(снижен|низк)/i,'снижены тромбоциты')},
        ],
        missing_findings:['протеинурия или соотношение белок/креатинин','креатинин и диурез','признаки гемолиза: ЛДГ, билирубин, шистоциты, гаптоглобин','состояние плода и акушерская оценка'],
        recommended_checks:['срочная госпитализация/акушерская маршрутизация','контроль АД и симптомов тяжелой преэклампсии','ОАК с тромбоцитами, АЛТ/АСТ, креатинин, протеинурия','оценка гемолиза для исключения HELLP'],
        sources:[sources[0]],
      },
      {
        rank:2,
        diagnosis:'HELLP-синдром, необходимо исключить/подтвердить',
        icd10_code:'O14.2',
        confidence:'medium',
        why_this_diagnosis:'Два ключевых компонента уже указаны: повышенные печеночные ферменты и тромбоцитопения. Гемолиз в исходном запросе не указан, поэтому HELLP нельзя утверждать окончательно.',
        supporting_findings:[
          {finding:'повышение АЛТ/АСТ',patient_evidence:has(symptoms,/алт\s*и\s*аст|аст\s*и\s*алт|повышен[а-я\s]{0,24}алт[а-я\s]{0,12}аст/i,'повышены АЛТ и АСТ')},
          {finding:'тромбоцитопения',patient_evidence:has(symptoms,/тромбоцит[а-я\s]{0,30}(снижен|низк)/i,'снижены тромбоциты')},
          {finding:'боль в правом подреберье',patient_evidence:has(symptoms,/прав[а-я\s]{0,18}подребер[а-я]*/i,'боль в правом подреберье')},
        ],
        missing_findings:['ЛДГ','общий/непрямой билирубин','шистоциты в мазке крови','гаптоглобин','динамика тромбоцитов'],
        recommended_checks:['срочно проверить маркеры гемолиза','повторить ОАК и печеночные ферменты в динамике','не задерживать акушерскую маршрутизацию'],
        sources:[sources[1]],
      },
      {
        rank:3,
        diagnosis:'Преэклампсия неуточненная / гестационная гипертензия как менее вероятный вариант',
        icd10_code:'O14.9',
        confidence:'low',
        why_this_diagnosis:'Менее специфичный вариант включен только для дифференциала. Текущие факты больше соответствуют тяжелой форме, поэтому этот вариант не должен снижать срочность.',
        supporting_findings:[
          {finding:'беременность с гипертензией',patient_evidence:has(symptoms,/170\/110/i,'АД 170/110 при беременности')},
        ],
        missing_findings:['полный акушерский анамнез','протеинурия','данные о хронической гипертензии до беременности'],
        recommended_checks:['уточнить анамнез гипертензии','оценить органное поражение','не использовать этот вариант для отсрочки госпитализации'],
        sources:[sources[2]],
      },
    ],
    follow_up_questions:[
      {question:'Есть ли протеинурия или соотношение белок/креатинин?',target_diagnoses:['O14.1'],rationale:'Это критерий преэклампсии, но его нельзя считать присутствующим без данных.'},
      {question:'Есть ли ЛДГ, билирубин, шистоциты или сниженный гаптоглобин?',target_diagnoses:['O14.2'],rationale:'Это подтверждает или исключает гемолиз для HELLP.'},
      {question:'Какой креатинин, диурез и состояние плода?',target_diagnoses:['O14.1','O14.2'],rationale:'Нужно оценить органное поражение и срочность акушерской тактики.'},
    ],
  };
}
