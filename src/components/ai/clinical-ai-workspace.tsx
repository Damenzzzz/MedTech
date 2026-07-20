'use client';

import {useMemo,useRef,useState} from 'react';
import {Bot,Brain,ClipboardCheck,FileAudio,Loader2,Mic,RefreshCw,Search,Send,ShieldAlert,Square,Stethoscope,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';

type Finding={finding:string;patient_evidence?:string|null};
type Diagnosis={rank:number;diagnosis:string;icd10_code:string;confidence?:string|null;why_this_diagnosis?:string|null;supporting_findings?:Finding[];missing_findings?:string[];recommended_checks?:string[]};
type Question={question:string;target_diagnoses?:string[];rationale?:string};
type DiagnoseResponse={case_id?:string|null;diagnoses:Diagnosis[];follow_up_questions?:Question[];cached_context?:boolean};
type DiagnoseJobStatus={job_id?:string;status?:string;result?:DiagnoseResponse;error?:string};
type AdviceStep={step?:string;action?:string;why?:string};
type AdviceOption={option?:string;treatment?:string;when?:string;avoid_if?:string};
type AdviceResponse={safety_notice:string;urgency?:string;most_likely_risks?:string[];do_now?:AdviceStep[];ask_or_measure_next?:string[];treatment_options?:AdviceOption[];referral?:{decision?:string;reason?:string};what_not_to_do?:string[];sources?:{title?:string;protocol_id?:string;excerpt?:string}[];rag_status?:string;rag_decision?:string};
type AdviceChatTurn={role:'clinician'|'assistant';content:string};
type AdviceChatResponse={reply:string;questions?:string[];need_rag?:boolean;urgency_hint?:string;safety_notice?:string};
type DialogueTurn={speaker:'doctor'|'patient'|'relative'|'nurse'|'unknown';text:string;start?:number;end?:number};
type SimCase={id:string;title:string;level:'Базовый'|'Средний'|'Сложный';specialty:string;opening:string;publicBrief:string;hiddenContext:string;diagnosis:string;keyFindings:string[];expectedQuestions:string[];expectedDiagnoses:string[];distractorDiagnoses:string[];expectedPlan:string[];unsafePlan:string[]};

const sampleCase='Беременная женщина, 34 неделя беременности. Сильная головная боль, мелькание мушек перед глазами, боль в правом подреберье, выраженные отеки ног. Артериальное давление 170/110 мм рт. ст. В анализах повышены АЛТ и АСТ, снижены тромбоциты.';
const refineSample='Общий билирубин 36 мкмоль/л, преимущественно непрямой. В мазке периферической крови обнаружены шистоциты, признаки гемолиза подтверждаются. Гаптоглобин 18 мг/дл, снижен.';
const SIM_CASES:SimCase[]=[
  {id:'viral-uri',level:'Базовый',specialty:'Терапия',title:'ОРВИ без красных флагов',opening:'Третий день насморк, горло першит, немного кашляю.',publicBrief:'Молодой пациент с насморком, болью в горле и слабостью.',hiddenContext:'Пациент 25 лет. Три дня насморк, першение в горле, сухой кашель, температура максимум 37.4. Одышки, боли в груди, сыпи, ригидности затылка нет. Просит антибиотик, потому что завтра работа. Аллергий нет. Говорит спокойно.',diagnosis:'J06.9 Острая вирусная инфекция верхних дыхательных путей',keyFindings:['3 дня симптомов','субфебрилитет','нет одышки','нет красных флагов'],expectedQuestions:['длительность','температура','одышка','боль в груди','контакты','аллергии'],expectedDiagnoses:['J06.9 ОРВИ'],distractorDiagnoses:['J18.9 Пневмония','J03.9 Бактериальный тонзиллит','U07.1 COVID-19','J01.9 Синусит'],expectedPlan:['симптоматическое лечение','объяснить отсутствие показаний к антибиотику','safety-netting','повторный осмотр при ухудшении'],unsafePlan:['антибиотик без показаний','игнорировать одышку','не объяснить красные флаги']},
  {id:'gerd',level:'Базовый',specialty:'Гастроэнтерология',title:'ГЭРБ и изжога',opening:'После еды жжет за грудиной, особенно когда ложусь.',publicBrief:'Пациент 42 лет с жжением после еды и в положении лежа.',hiddenContext:'Пациент 42 года. Жжение после жирной еды и кофе, хуже лежа, кислая отрыжка. Похудения, дисфагии, рвоты кровью, черного стула нет. Боль не связана с нагрузкой. Курит редко. Боится, что это сердце.',diagnosis:'K21.9 Гастроэзофагеальная рефлюксная болезнь',keyFindings:['изжога после еды','хуже лежа','кислая отрыжка','нет alarm symptoms'],expectedQuestions:['связь с едой','положение лежа','дисфагия','похудение','кровотечение','связь с нагрузкой'],expectedDiagnoses:['K21.9 ГЭРБ'],distractorDiagnoses:['I20.0 Нестабильная стенокардия','K25 Язва желудка','K80 Желчная колика','F45.3 Соматоформное расстройство'],expectedPlan:['образ жизни','пробная кислотосупрессивная терапия по протоколу','исключить alarm symptoms','план наблюдения'],unsafePlan:['не спросить про дисфагию','не отличить от боли в груди','назначить только седативные']},
  {id:'iron-anemia',level:'Базовый',specialty:'Терапия',title:'Железодефицитная анемия',opening:'Последние месяцы быстро устаю, стало тяжело подниматься по лестнице.',publicBrief:'Женщина 39 лет со слабостью и одышкой при нагрузке.',hiddenContext:'Пациентка 39 лет. Слабость 3 месяца, одышка при подъеме, сердцебиение. Менструации обильные 7 дней, мясо ест редко. Черного стула нет, крови в стуле не видела, беременности нет. Бледная. Не знает гемоглобин.',diagnosis:'D50.9 Железодефицитная анемия',keyFindings:['хроническая слабость','одышка при нагрузке','обильные менструации','низкое потребление железа'],expectedQuestions:['длительность','кровопотери','менструации','питание','стул','беременность'],expectedDiagnoses:['D50.9 Железодефицитная анемия'],distractorDiagnoses:['E03 Гипотиреоз','F32 Депрессия','I50 Сердечная недостаточность','D51 B12-дефицитная анемия'],expectedPlan:['ОАК','ферритин/железо','поиск источника кровопотери','коррекция дефицита железа','наблюдение'],unsafePlan:['не уточнить кровотечение','игнорировать выраженную одышку']},
  {id:'pyelonephritis',level:'Средний',specialty:'Терапия',title:'Острый пиелонефрит',opening:'Болит справа в пояснице, знобит, часто бегаю в туалет.',publicBrief:'Женщина 34 лет с лихорадкой, болью в пояснице и дизурией.',hiddenContext:'Пациентка 34 года. Температура 39, озноб, боль справа в пояснице, дизурия, частое мочеиспускание. Тошнота есть, рвоты нет. Беременность отрицает. Аллергии на антибиотики не знает. Боль усиливается при поколачивании.',diagnosis:'N10 Острый пиелонефрит',keyFindings:['лихорадка','озноб','боль в пояснице','дизурия'],expectedQuestions:['температура','дизурия','беременность','рвота','аллергии','боль в боку'],expectedDiagnoses:['N10 Острый пиелонефрит'],distractorDiagnoses:['N30 Цистит','K35.8 Аппендицит','N20 Почечная колика','A09 Гастроэнтерит'],expectedPlan:['ОАМ','посев мочи','оценка тяжести','антибиотикотерапия по протоколу','госпитализация при осложнениях'],unsafePlan:['лечить как простой цистит при лихорадке','не исключить беременность']},
  {id:'pneumonia',level:'Средний',specialty:'Пульмонология',title:'Внебольничная пневмония',opening:'Температура высокая, кашляю мокротой, идти тяжело.',publicBrief:'Мужчина 45 лет с кашлем, лихорадкой и сниженной сатурацией.',hiddenContext:'Пациент Сергей, 45 лет. 4 дня температура до 39.1, желтая мокрота, боль справа при глубоком вдохе, одышка при ходьбе. SpO2 91%, ЧДД 26. Кровохарканья нет. Антибиотики не принимал. Устал, тревожится о госпитализации.',diagnosis:'J18.9 Внебольничная пневмония',keyFindings:['лихорадка','мокрота','плевритическая боль','SpO2 91','ЧДД 26'],expectedQuestions:['сатурация','одышка','мокрота','боль в груди','кровохарканье','коморбидность'],expectedDiagnoses:['J18.9 Внебольничная пневмония'],distractorDiagnoses:['J06.9 ОРВИ','J20 Острый бронхит','I26 ТЭЛА','U07.1 COVID-19'],expectedPlan:['оценка тяжести','рентген грудной клетки','ОАК/CRP','антибиотик по протоколу','кислород при гипоксемии','маршрутизация'],unsafePlan:['отпустить без оценки сатурации','антибиотик без оценки тяжести']},
  {id:'appendicitis',level:'Средний',specialty:'Хирургия',title:'Острый аппендицит',opening:'Живот болит, сначала около пупка, теперь справа внизу.',publicBrief:'Мужчина 27 лет с миграцией боли в правую подвздошную область.',hiddenContext:'Пациент 27 лет. Боль началась около пупка 12 часов назад, сместилась вправо вниз. Тошнота, аппетита нет, температура 38.1. Диареи нет. Мочеиспускание без боли. При движении боль сильнее. Боится операции.',diagnosis:'K35.8 Острый аппендицит',keyFindings:['миграция боли','правая подвздошная область','анорексия','температура'],expectedQuestions:['миграция боли','аппетит','тошнота','температура','диарея','мочевые симптомы'],expectedDiagnoses:['K35.8 Острый аппендицит'],distractorDiagnoses:['A09 Гастроэнтерит','N20 Почечная колика','K80 Желчная колика','K52 Колит'],expectedPlan:['хирургический осмотр','ОАК/CRP','УЗИ/КТ по показаниям','не давать слабительные','подготовка к маршрутизации'],unsafePlan:['слабительное','отпустить с обезболивающим без осмотра']},
  {id:'asthma',level:'Средний',specialty:'Пульмонология',title:'Обострение бронхиальной астмы',opening:'Мне трудно дышать, свистит в груди, после кошки стало хуже.',publicBrief:'Молодая женщина с одышкой и свистящим дыханием после контакта с аллергеном.',hiddenContext:'Пациентка 23 года. Есть астма с детства. Была в доме с кошкой, через час усилилась одышка, свист, кашель. Говорит короткими фразами. SpO2 89%, ЧДД 30. Ингалятор дома почти закончился. Температуры нет.',diagnosis:'J45.901 Обострение бронхиальной астмы',keyFindings:['контакт с аллергеном','свистящее дыхание','короткие фразы','SpO2 89'],expectedQuestions:['триггер','ингалятор','речь фразами','сатурация','предыдущие госпитализации','аллергии'],expectedDiagnoses:['J45.901 Обострение астмы'],distractorDiagnoses:['J18.9 Пневмония','I50 Сердечная недостаточность','F41 Паническая атака','T78.2 Анафилаксия'],expectedPlan:['оценка тяжести','SABA/бронходилататор по протоколу','кислород','системные ГКС по показаниям','наблюдение/госпитализация при тяжелом течении'],unsafePlan:['назвать паникой при SpO2 89','отпустить без ингаляционной терапии']},
  {id:'dka',level:'Сложный',specialty:'Эндокринология',title:'Диабетический кетоацидоз',opening:'Меня тошнит, очень хочется пить, часто бегаю в туалет.',publicBrief:'Девушка 19 лет с рвотой, жаждой, полиурией и слабостью.',hiddenContext:'Пациентка 19 лет, сахарный диабет 1 типа. На фоне ОРВИ пропускала инсулин два дня. Жажда, полиурия, рвота, боль в животе, слабость. Дыхание глубокое и частое, запах ацетона изо рта. Глюкоза дома высокая, точную цифру не помнит.',diagnosis:'E10.1 Диабетический кетоацидоз',keyFindings:['СД1','пропуск инсулина','рвота','полиурия/жажда','дыхание Куссмауля'],expectedQuestions:['диабет','инсулин','инфекция','рвота','дыхание','глюкоза/кетоны'],expectedDiagnoses:['E10.1 Диабетический кетоацидоз'],distractorDiagnoses:['A09 Гастроэнтерит','E16.2 Гипогликемия','K35.8 Аппендицит','F41 Паническая атака'],expectedPlan:['неотложная госпитализация','глюкоза/кетоны/КЩС/электролиты','регидратация','инсулин по протоколу','контроль калия','поиск триггера'],unsafePlan:['назначить противорвотное и отпустить','инсулин без контроля калия']},
  {id:'acs',level:'Сложный',specialty:'Кардиология',title:'Острый коронарный синдром',opening:'Давит за грудиной, отдает в левую руку, я вспотел.',publicBrief:'Мужчина 46 лет с давящей болью за грудиной, иррадиацией и холодным потом.',hiddenContext:'Пациент Арман, 46 лет. Боль началась 40 минут назад после подъема по лестнице, давящая, за грудиной, отдает в левую руку и челюсть. Холодный пот, тошнота, страх. Курит 20 лет. Отец умер от инфаркта в 55. Боль не зависит от дыхания. Не принимал нитраты.',diagnosis:'I20.0 Нестабильная стенокардия / ОКС до исключения инфаркта',keyFindings:['давящая боль','иррадиация','холодный пот','факторы риска','40 минут'],expectedQuestions:['начало боли','характер','иррадиация','нагрузка','факторы риска','одышка/пот/тошнота'],expectedDiagnoses:['I20.0 ОКС/нестабильная стенокардия','I21 Острый инфаркт миокарда'],distractorDiagnoses:['K21.9 ГЭРБ','M94 Костохондрит','F41 Паническая атака','J18.9 Пневмония'],expectedPlan:['ЭКГ немедленно','тропонин в динамике','мониторинг','антиагрегант/антикоагулянт по протоколу','маршрутизация в стационар'],unsafePlan:['лечить как изжогу без ЭКГ','отпустить домой']},
  {id:'tia',level:'Сложный',specialty:'Неврология',title:'Транзиторная ишемическая атака',opening:'У меня на несколько минут ослабла правая рука, сейчас почти прошло.',publicBrief:'Мужчина 67 лет с кратковременной слабостью руки и нарушением речи.',hiddenContext:'Пациент 67 лет. 40 минут назад правая рука ослабла на 15 минут, жена заметила невнятную речь. Сейчас почти прошло. АД 172/96. Есть мерцательная аритмия, антикоагулянт принимает нерегулярно. Головной боли нет, судорог не было. Недооценивает симптомы.',diagnosis:'G45.9 Транзиторная ишемическая атака',keyFindings:['фокальный дефицит','нарушение речи','регресс симптомов','ФП','высокое АД'],expectedQuestions:['время начала','FAST','речь','регресс','ФП/антикоагулянты','судороги'],expectedDiagnoses:['G45.9 ТИА','I63 Инсульт нужно исключить'],distractorDiagnoses:['G43 Мигрень','F44 Конверсионное расстройство','E16.2 Гипогликемия','R55 Обморок'],expectedPlan:['срочная маршрутизация как инсульт/TIA','КТ/МРТ по протоколу','глюкоза','ЭКГ','оценка антикоагуляции','не отпускать из-за регресса'],unsafePlan:['успокоить и отпустить','не уточнить время начала']},
  {id:'anaphylaxis',level:'Сложный',specialty:'Неотложная помощь',title:'Анафилаксия',opening:'После таблетки стало трудно дышать, губы распухли, всё чешется.',publicBrief:'Женщина 31 года с отеком губ, удушьем и сыпью после антибиотика.',hiddenContext:'Пациентка 31 год. 20 минут назад приняла первую таблетку амоксициллина. Быстро появились зудящие волдыри, отек губ, хриплый голос, трудно дышать. АД 82/48, SpO2 86. Раньше была аллергия на пенициллин в детстве, точно не помнит. Очень испугана.',diagnosis:'T78.2 Анафилаксия',keyFindings:['лекарственный триггер','крапивница','отек губ/голоса','гипотензия','гипоксемия'],expectedQuestions:['триггер','время после приема','дыхание','отек языка/голоса','сыпь','АД'],expectedDiagnoses:['T78.2 Анафилаксия'],distractorDiagnoses:['J45.901 Астма','F41 Паническая атака','L50 Крапивница без анафилаксии','I95 Гипотензия'],expectedPlan:['адреналин немедленно по протоколу','ABC','кислород','вызов реанимации','инфузия','наблюдение после стабилизации'],unsafePlan:['дать только антигистаминный','ждать анализов','назвать паникой']},
  {id:'preeclampsia-hellp',level:'Сложный',specialty:'Акушерство',title:'Тяжелая преэклампсия / HELLP',opening:'Доктор, очень болит голова, перед глазами мушки, и справа под ребрами больно.',publicBrief:'Беременная 34 недели с головной болью, зрительными нарушениями, болью в правом подреберье и отеками.',hiddenContext:'Пациентка 32 года. Беременность 34 недели. АД 170/110, сильная головная боль, мушки перед глазами, боль в правом подреберье, выраженные отеки ног. АЛТ/АСТ повышены, тромбоциты снижены. Протеинурию и креатинин еще не проверяли. Гемолиз не подтвержден, если спросит про билирубин/ЛДГ/шистоциты — результатов пока нет. Пациентка тревожится за ребенка.',diagnosis:'O14.1 Тяжелая преэклампсия; O14.2 HELLP-синдром исключить/подтвердить',keyFindings:['34 недели','АД 170/110','головная боль/зрение','правое подреберье','АЛТ/АСТ','тромбоцитопения'],expectedQuestions:['срок беременности','АД','зрение','боль в эпигастрии/подреберье','протеинурия','тромбоциты/АЛТ/АСТ/гемолиз'],expectedDiagnoses:['O14.1 Тяжелая преэклампсия','O14.2 HELLP-синдром'],distractorDiagnoses:['O13 Гестационная гипертензия','G43 Мигрень','K80 Желчная колика','O10 Хроническая гипертензия'],expectedPlan:['срочная госпитализация','магния сульфат по протоколу','антигипертензивная терапия','контроль тромбоцитов/АЛТ/АСТ/креатинина/протеинурии','оценка гемолиза','акушерская тактика'],unsafePlan:['лечить как мигрень','отпустить домой','не оценить HELLP']},
  {id:'sepsis',level:'Сложный',specialty:'Инфекционные болезни',title:'Сепсис после инфекции мочевых путей',opening:'Меня знобит, кружится голова, я совсем слабая.',publicBrief:'Пожилая пациентка с лихорадкой, слабостью, гипотензией и подозрением на инфекцию.',hiddenContext:'Пациентка 72 года. Два дня боль и жжение при мочеиспускании, сегодня озноб, спутанность, слабость. Температура 39.4, АД 88/52, ЧСС 124, ЧДД 28. Мочи мало. Боль в пояснице справа. Сахарный диабет 2 типа. Родственница говорит, что стала сонной.',diagnosis:'A41.9 Сепсис неуточненный, вероятный уросепсис',keyFindings:['инфекция мочевых путей','гипотензия','тахикардия','тахипноэ','спутанность','олигурия'],expectedQuestions:['очаг инфекции','АД/ЧСС/ЧДД','сознание','диурез','коморбидность','антибиотики'],expectedDiagnoses:['A41.9 Сепсис','N10 Пиелонефрит/уросепсис'],distractorDiagnoses:['N30 Цистит','A09 Гастроэнтерит','I95 Ортостатическая гипотензия','F05 Делирий без соматики'],expectedPlan:['sepsis bundle','лактат/посевы','антибиотики срочно','инфузия','контроль диуреза','госпитализация/ОИТАР'],unsafePlan:['лечить как простой цистит','отпустить домой','ждать посева перед антибиотиком при шоке']},
];

export function ClinicalAIWorkspace(){
  const [tab,setTab]=useState<'rag'|'advice'|'sim'|'voice'>('rag');
  return <main className="noise min-h-[calc(100vh-4rem)] bg-[#0f1917] text-slate-100">
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-teal-300">AI Clinical Platform</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Клинический AI-ассистент</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 sm:grid-cols-4">
          <Tab active={tab==='rag'} onClick={()=>setTab('rag')} icon={Stethoscope} label="RAG"/>
          <Tab active={tab==='advice'} onClick={()=>setTab('advice')} icon={ShieldAlert} label="Срочный совет"/>
          <Tab active={tab==='sim'} onClick={()=>setTab('sim')} icon={Brain} label="Симулятор"/>
          <Tab active={tab==='voice'} onClick={()=>setTab('voice')} icon={Mic} label="STT"/>
        </div>
      </div>
      {tab==='rag'&&<RagPanel/>}
      {tab==='advice'&&<AdvicePanel/>}
      {tab==='sim'&&<SimulatorPanel/>}
      {tab==='voice'&&<VoicePanel/>}
    </section>
  </main>;
}

function Tab({active,onClick,icon:Icon,label}:{active:boolean;onClick:()=>void;icon:typeof Stethoscope;label:string}) {
  return <button onClick={onClick} className={`focus-ring flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${active?'bg-teal-500 text-slate-950':'text-slate-300 hover:bg-white/8'}`}>
    <Icon size={16}/>{label}
  </button>;
}

function RagPanel(){
  const [symptoms,setSymptoms]=useState(sampleCase);
  const [additional,setAdditional]=useState('');
  const [data,setData]=useState<DiagnoseResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function diagnose(){
    setLoading(true);setError('');
    try{
      const job=await startDiagnoseJob(symptoms);
      if(job?.job_id){
        const result=await waitDiagnoseJob(job.job_id);
        setData(result);
      }else{
        const response=await fetch('/api/clinical/diagnose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({symptoms})});
        if(!response.ok)throw new Error(await response.text());
        setData(await response.json());
      }
    }catch(e){setError(e instanceof Error?e.message:'Ошибка анализа');}
    finally{setLoading(false);}
  }
  async function refine(){
    if(!data?.case_id)return diagnose();
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/clinical/refine',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({case_id:data.case_id,symptoms,additional_info:additional})});
      if(!response.ok)throw new Error(await response.text());
      setData(await response.json());
    }catch(e){setError(e instanceof Error?e.message:'Ошибка уточнения');}
    finally{setLoading(false);}
  }

  return <div className="grid gap-5 py-6 lg:grid-cols-[420px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Stethoscope className="text-teal-300"/><h2 className="font-semibold">Клинический запрос</h2></div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Жалобы, анамнез, осмотр, анализы</label>
      <textarea className="input mt-2 min-h-72 border-white/10 bg-white/5 text-lg leading-8 text-white" value={symptoms} onChange={e=>setSymptoms(e.target.value)}/>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={diagnose} disabled={loading||!symptoms.trim()} className="h-12"><Search size={18}/>{loading?'Анализ...':'Найти по протоколам'}</Button>
        <Button type="button" variant="secondary" onClick={()=>setSymptoms(sampleCase)}>Demo case</Button>
      </div>
      <label className="mt-6 block text-sm font-semibold text-slate-300">Ответы пациента на уточнения</label>
      <textarea className="input mt-2 min-h-36 border-white/10 bg-white/5 text-white" value={additional} onChange={e=>setAdditional(e.target.value)} placeholder={refineSample}/>
      <Button onClick={refine} disabled={loading||!additional.trim()} variant="secondary" className="mt-3 w-full"><RefreshCw size={17}/>Уточнить без нового поиска</Button>
      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">Результат поддерживает решение врача и не заменяет очную диагностику.</p>
    </aside>
    <section className="space-y-5">
      {error&&<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      {!data&&<EmptyState loading={loading}/>}
      {data&&<><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Дифференциальный ряд</h2><span className="text-sm text-slate-400">{data.diagnoses.length} вариантов</span></div><div className="grid gap-4">{data.diagnoses.slice(0,3).map(d=><DiagnosisCard key={`${d.rank}-${d.icd10_code}`} item={d}/>)}</div><Questions questions={data.follow_up_questions??[]}/></>}
    </section>
  </div>;
}

async function startDiagnoseJob(symptoms:string) {
  try{
    const response=await fetch('/api/clinical/diagnose/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({symptoms})});
    if(!response.ok)return null;
    return await response.json() as DiagnoseJobStatus;
  }catch{return null;}
}

async function waitDiagnoseJob(jobId:string) {
  const deadline=Date.now()+300000;
  let lastError='';
  while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,3500));
    try{
      const response=await fetch(`/api/clinical/diagnose/jobs/${encodeURIComponent(jobId)}`,{cache:'no-store'});
      if(!response.ok){lastError=await response.text();continue;}
      const data=await response.json() as DiagnoseJobStatus;
      if(data.status==='completed'&&data.result)return data.result;
      if(data.status==='failed'||data.status==='not_found')throw new Error(`RAG job ${data.status}`);
    }catch(e){lastError=e instanceof Error?e.message:lastError;}
  }
  throw new Error(lastError||'RAG анализ занял больше 5 минут');
}

function EmptyState({loading}:{loading:boolean}){return <div className="grid min-h-[520px] place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center">
  <div>{loading?<Loader2 className="mx-auto animate-spin text-teal-300" size={38}/>:<Bot className="mx-auto text-teal-300" size={42}/>}<h2 className="mt-5 text-xl font-semibold">{loading?'Идёт анализ протоколов':'Готов к анализу'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">RAG сопоставит запрос с протоколами, вернёт top-3 диагнозов, объяснения и уточняющие вопросы.</p></div>
</div>}

function AdvicePanel(){
  const [scenario,setScenario]=useState('Аул, ФАП. Мужчина 55 лет, давящая боль за грудиной 40 минут, отдает в левую руку, холодный пот, тошнота. АД 150/90, пульс 104, SpO2 94%. Кардиолога рядом нет, есть ЭКГ, кислород, аспирин, нитроглицерин.');
  const [role,setRole]=useState('Врач общей практики');
  const [resources,setResources]=useState('ФАП/сельская амбулатория: медсестра, врач общей практики, ЭКГ, кислород, базовые лекарства, скорая/эвакуация до районной больницы.');
  const [chat,setChat]=useState<AdviceChatTurn[]>([{role:'assistant',content:'Опишите ситуацию или задайте вопрос. Я могу быстро уточнить ключевые данные, а для финального протокольного плана нажмите "Дать действия".'}]);
  const [message,setMessage]=useState('Что делать сейчас до приезда скорой?');
  const [data,setData]=useState<AdviceResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [chatLoading,setChatLoading]=useState(false);
  const [error,setError]=useState('');
  async function sendAdviceMessage(){
    const value=message.trim();
    if(!value)return;
    const next=[...chat,{role:'clinician' as const,content:value}];
    setChat(next);setMessage('');setChatLoading(true);setError('');
    try{
      const response=await fetch('/api/clinical/advice',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'chat',scenario,role,resources,messages:next})});
      if(!response.ok)throw new Error(await response.text());
      const result=await response.json() as AdviceChatResponse;
      const extra=(result.questions??[]).length?`\n\nУточнить:\n${(result.questions??[]).map((q,i)=>`${i+1}. ${q}`).join('\n')}`:'';
      const hint=result.need_rag?'\n\nДля точной тактики по протоколам нажмите "Дать действия".':'';
      setChat([...next,{role:'assistant',content:`${result.reply}${extra}${hint}`}]);
    }catch(e){setError(e instanceof Error?e.message:'Ошибка консультации');}
    finally{setChatLoading(false);}
  }
  async function askAdvice(){
    setLoading(true);setError('');
    try{
      const dialogue=chat.map(turn=>`${turn.role==='clinician'?'Медработник':'AI'}: ${turn.content}`).join('\n');
      const response=await fetch('/api/clinical/advice',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'action',scenario:`${scenario}\n\nКороткий чат до решения:\n${dialogue}`,role,resources,messages:chat})});
      if(!response.ok)throw new Error(await response.text());
      setData(await response.json());
    }catch(e){setError(e instanceof Error?e.message:'Ошибка консультации');}
    finally{setLoading(false);}
  }
  return <div className="grid gap-5 py-6 lg:grid-cols-[430px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><ShieldAlert className="text-teal-300"/><h2 className="font-semibold">Срочный совет врачу</h2></div>
      <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100">AI-ассистент помогает сориентироваться по протоколам. Последнее клиническое решение принимает врач или ответственный медработник на месте.</div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Кто спрашивает</label>
      <input className="input mt-2 border-white/10 bg-white/5 text-white" value={role} onChange={e=>setRole(e.target.value)} placeholder="Врач, медсестра, фельдшер"/>
      <label className="mt-4 block text-sm font-semibold text-slate-300">Что есть на месте</label>
      <textarea className="input mt-2 min-h-28 border-white/10 bg-white/5 text-sm leading-6 text-white" value={resources} onChange={e=>setResources(e.target.value)}/>
      <label className="mt-4 block text-sm font-semibold text-slate-300">Ситуация, жалобы, витальные показатели</label>
      <textarea className="input mt-2 min-h-64 border-white/10 bg-white/5 text-lg leading-8 text-white" value={scenario} onChange={e=>setScenario(e.target.value)}/>
      <Button onClick={askAdvice} disabled={loading||!scenario.trim()} className="mt-4 h-12 w-full"><Search size={18}/>{loading?'Сверяю с протоколами...':'Дать действия'}</Button>
    </aside>
    <section className="space-y-5">
      {error&&<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <div className="rounded-2xl border border-white/10 bg-[#162320] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><div><h2 className="text-2xl font-semibold">Быстрый чат</h2><p className="mt-1 text-sm text-slate-400">Короткие уточнения идут без тяжелого RAG. Для плана действий LLM сам решит, нужен ли долгий протокольный поиск.</p></div><Button onClick={askAdvice} disabled={loading||!scenario.trim()} variant="secondary"><ShieldAlert size={17}/>{loading?'Анализ...':'Дать действия'}</Button></div>
        <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">{chat.map((turn,index)=><div key={`${index}-${turn.content}`} className={`max-w-[86%] whitespace-pre-line rounded-2xl p-4 text-sm leading-6 ${turn.role==='clinician'?'ml-auto bg-teal-500/15 text-teal-50':'bg-white/7 text-slate-200'}`}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{turn.role==='clinician'?'Медработник':'AI'}</span>{turn.content}</div>)}{chatLoading&&<div className="rounded-2xl bg-white/7 p-4 text-sm text-slate-400">AI думает быстро...</div>}</div>
        <div className="mt-5 flex gap-2"><input className="input border-white/10 bg-white/5 text-white" value={message} placeholder="Спросите, что уточнить или что делать..." onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendAdviceMessage()}}/><Button onClick={sendAdviceMessage} disabled={chatLoading}><Send size={17}/></Button></div>
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">Если нужна конкретная тактика, нажмите “Дать действия”: лёгкий вопрос вернётся быстро, а глубокий RAG по протоколам может занять до 2-3 минут.</p>
      </div>
      {!data&&<div className="grid min-h-60 place-items-center rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center"><div>{loading?<Loader2 className="mx-auto animate-spin text-teal-300" size={38}/>:<ShieldAlert className="mx-auto text-teal-300" size={42}/>}<h2 className="mt-5 text-xl font-semibold">{loading?'Формирую план действий':'План действий появится здесь'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">LLM сначала решит, нужен ли RAG. Если нужен глубокий протокольный анализ, ожидание может быть до 2-3 минут.</p></div></div>}
      {data&&<><div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100">{data.safety_notice}</div><div className="rounded-2xl border border-white/10 bg-[#162320] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Тактика сейчас</h2>{data.urgency&&<span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-100">{data.urgency}</span>}</div>{data.rag_decision&&<p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-400">Решение LLM-router: {data.rag_decision}</p>}<AdviceList title="Главные риски" items={data.most_likely_risks??[]}/><StepList title="Что сделать сразу" steps={data.do_now??[]}/><AdviceList title="Что уточнить или измерить" items={data.ask_or_measure_next??[]}/></div><div className="grid gap-5 xl:grid-cols-2"><OptionList title="Варианты лечения" options={data.treatment_options??[]}/><section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Маршрутизация</h3><p className="mt-3 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200">{data.referral?.decision??'Уточнить по тяжести и доступности помощи.'}</p>{data.referral?.reason&&<p className="mt-3 text-sm leading-6 text-slate-400">{data.referral.reason}</p>}<AdviceList title="Чего не делать" items={data.what_not_to_do??[]}/></section></div><SourcesList sources={data.sources??[]} status={data.rag_status}/></>}
    </section>
  </div>;
}

function DiagnosisCard({item}:{item:Diagnosis}){return <article className="rounded-2xl border border-white/10 bg-[#162320] p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-bold text-teal-300">#{item.rank} · {item.icd10_code}{item.confidence?` · ${item.confidence}`:''}</div><h3 className="mt-2 text-xl font-semibold">{item.diagnosis}</h3></div><ClipboardCheck className="text-teal-300"/></div>
  {item.why_this_diagnosis&&<p className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200">{item.why_this_diagnosis}</p>}
  <div className="mt-4 grid gap-4 lg:grid-cols-2">
    <FactList title="Поддерживает" items={(item.supporting_findings??[]).slice(0,6).map(x=>x.patient_evidence?`${x.finding} — ${x.patient_evidence}`:x.finding)}/>
    <FactList title="Нужно уточнить" items={(item.missing_findings??item.recommended_checks??[]).slice(0,6)}/>
  </div>
</article>}

function FactList({title,items}:{title:string;items:string[]}){return <div><h4 className="text-sm font-semibold text-slate-300">{title}</h4><ul className="mt-2 space-y-2">{items.length?items.map(x=><li key={x} className="rounded-lg bg-white/5 px-3 py-2 text-sm leading-5 text-slate-300">{x}</li>):<li className="text-sm text-slate-500">Нет данных</li>}</ul></div>}

function Questions({questions}:{questions:Question[]}){return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">Что уточнить врачу</h3><div className="mt-4 grid gap-3">{questions.slice(0,5).map(q=><div key={q.question} className="rounded-xl bg-white/5 p-4"><p className="font-medium">{q.question}</p>{q.rationale&&<p className="mt-2 text-sm leading-5 text-slate-400">{q.rationale}</p>}</div>)}</div></section>}

function AdviceList({title,items}:{title:string;items:string[]}){return <section className="mt-5"><h3 className="text-sm font-semibold text-slate-300">{title}</h3><div className="mt-3 grid gap-2">{items.length?items.slice(0,8).map(item=><div key={item} className="rounded-xl bg-white/5 p-3 text-sm leading-5 text-slate-200">{item}</div>):<div className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">Недостаточно данных</div>}</div></section>}

function StepList({title,steps}:{title:string;steps:AdviceStep[]}){return <section className="mt-5"><h3 className="text-sm font-semibold text-slate-300">{title}</h3><ol className="mt-3 space-y-2">{steps.length?steps.slice(0,8).map((step,index)=><li key={`${index}-${step.step??step.action}`} className="rounded-xl bg-white/5 p-3 text-sm leading-5 text-slate-200"><span className="font-semibold text-teal-200">{index+1}. {step.step??step.action}</span>{step.why&&<p className="mt-1 text-slate-400">{step.why}</p>}</li>):<li className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">Недостаточно данных</li>}</ol></section>}

function OptionList({title,options}:{title:string;options:AdviceOption[]}){return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 grid gap-3">{options.length?options.slice(0,8).map((item,index)=><div key={`${index}-${item.option??item.treatment}`} className="rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200"><p className="font-semibold text-teal-100">{item.option??item.treatment}</p>{item.when&&<p className="mt-1 text-slate-400">Когда: {item.when}</p>}{item.avoid_if&&<p className="mt-1 text-amber-100">Осторожно/не применять: {item.avoid_if}</p>}</div>):<p className="rounded-xl bg-white/5 p-4 text-sm text-slate-500">Нет безопасных вариантов без уточнения данных.</p>}</div></section>}

function SourcesList({sources,status}:{sources:{title?:string;protocol_id?:string;excerpt?:string}[];status?:string}){const label=ragStatusLabel(status);return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Источники RAG</h3>{label&&<span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{label}</span>}</div><div className="mt-4 grid gap-3">{sources.length?sources.slice(0,5).map((source,index)=><div key={`${index}-${source.title??source.protocol_id}`} className="rounded-xl bg-white/5 p-4 text-sm leading-6"><p className="font-semibold text-slate-200">{source.title??source.protocol_id??`Источник ${index+1}`}</p>{source.excerpt&&<p className="mt-2 text-slate-400">{source.excerpt}</p>}</div>):<p className="rounded-xl bg-white/5 p-4 text-sm text-slate-500">{status==='llm-direct-no-rag'?'LLM решил, что для этого лёгкого вопроса RAG не нужен.':'RAG сейчас недоступен или не успел вернуть источники. Совет помечен как ограниченный.'}</p>}</div></section>}

function ragStatusLabel(status?:string){
  if(!status)return '';
  if(status==='rag-ready')return 'RAG подключён';
  if(status==='rag-ready-with-warning')return 'RAG подключён с предупреждением';
  if(status==='llm-direct-no-rag')return 'Без RAG';
  if(status.startsWith('rag-job'))return 'RAG ещё не готов';
  if(status.startsWith('rag-error')||status==='rag-limited'||status==='rag-timeout-or-unavailable'||status==='rag-unavailable')return 'RAG временно недоступен';
  return status;
}

function SimulatorPanel(){
  const [scenario,setScenario]=useState<SimCase>(SIM_CASES[0]);
  const [publicBrief,setPublicBrief]=useState(SIM_CASES[0].publicBrief);
  const [hiddenContext,setHiddenContext]=useState(SIM_CASES[0].hiddenContext);
  const [dialogue,setDialogue]=useState<DialogueTurn[]>([{speaker:'patient',text:SIM_CASES[0].opening}]);
  const [message,setMessage]=useState('Когда началась головная боль и есть ли нарушения зрения?');
  const [selectedDx,setSelectedDx]=useState<string[]>([]);
  const [selectedPlan,setSelectedPlan]=useState<string[]>([]);
  const [feedback,setFeedback]=useState('');
  const [loading,setLoading]=useState(false);
  const [evaluating,setEvaluating]=useState(false);
  const diagnosisOptions=useMemo(()=>unique([...scenario.expectedDiagnoses,...scenario.distractorDiagnoses,'R69 Неуточненное состояние','F41 Паническая атака','K21.9 ГЭРБ','J18.9 Пневмония','I21 Острый инфаркт миокарда','O14.1 Тяжелая преэклампсия','A41.9 Сепсис']),[scenario]);
  const treatmentOptions=useMemo(()=>unique([...scenario.expectedPlan,...scenario.unsafePlan,'наблюдение амбулаторно','симптоматическое лечение','контроль жизненных показателей','консультация профильного специалиста','повторный осмотр при ухудшении']),[scenario]);
  function loadScenario(index:number){
    const next=SIM_CASES[index];
    setScenario(next);
    setPublicBrief(next.publicBrief);
    setHiddenContext(next.hiddenContext);
    setDialogue([{speaker:'patient',text:next.opening}]);
    setSelectedDx([]);
    setSelectedPlan([]);
    setFeedback('');
  }
  function customScenario(){
    const next:SimCase={id:'custom',level:'Средний',specialty:'Custom',title:'Свой сценарий',opening:'Здравствуйте, доктор. Что вы хотите уточнить?',publicBrief,hiddenContext,diagnosis:'Проверьте по своему скрытому контексту.',keyFindings:[],expectedQuestions:[],expectedDiagnoses:[],distractorDiagnoses:[],expectedPlan:[],unsafePlan:[]};
    setScenario(next);
    setDialogue([{speaker:'patient',text:next.opening}]);
    setSelectedDx([]);
    setSelectedPlan([]);
    setFeedback('');
  }
  async function ask(){
    if(!message.trim())return;
    const next=[...dialogue,{speaker:'doctor' as const,text:message}];
    setDialogue(next);setMessage('');setLoading(true);
    try{
      const response=await fetch('/api/simulator/respond',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseContext:scenario,publicBrief,hiddenContext,dialogue:next})});
      const data=await response.json();
      setDialogue([...next,{speaker:'patient',text:data.answer??'Можете повторить вопрос?'}]);
    }finally{setLoading(false);}
  }
  function toggle(value:string,list:string[],setList:(next:string[])=>void){
    setList(list.includes(value)?list.filter(x=>x!==value):[...list,value]);
  }
  function evaluate(){
    setEvaluating(true);
    setFeedback('');
    fetch('/api/simulator/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseContext:scenario,publicBrief,hiddenContext,dialogue,selectedDiagnoses:selectedDx,selectedPlan})})
      .then(async response=>response.ok?response.json():Promise.reject(new Error(await response.text())))
      .then(data=>setFeedback(data.feedback??'Оценка готова.'))
      .catch(()=>setFeedback(localEvaluate(scenario,selectedDx,selectedPlan)))
      .finally(()=>setEvaluating(false));
  }
  const clinicalText=useMemo(()=>dialogue.map(x=>`${roleLabel(x.speaker)}: ${x.text}`).join('\n'),[dialogue]);
  return <div className="grid gap-5 py-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Brain className="text-teal-300"/><h2 className="font-semibold">Сценарий</h2></div>
      <div className="mt-5 max-h-[430px] space-y-2 overflow-y-auto pr-1">{SIM_CASES.map((item,index)=><button key={item.id} onClick={()=>loadScenario(index)} className={`focus-ring w-full rounded-xl border px-3 py-3 text-left text-sm ${scenario.id===item.id?'border-teal-400/40 bg-teal-400/10 text-teal-100':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">{item.level} · {item.specialty}</span>{item.title}</button>)}</div>
      <label className="mt-5 block text-sm font-semibold text-slate-300">Открытая вводная для студента</label>
      <textarea className="input mt-2 min-h-28 border-white/10 bg-white/5 text-sm leading-6 text-white" value={publicBrief} onChange={e=>setPublicBrief(e.target.value)}/>
      <label className="mt-4 block text-sm font-semibold text-slate-300">Скрытый контекст пациента для LLM</label>
      <textarea className="input mt-2 min-h-52 border-white/10 bg-white/5 text-sm leading-6 text-white" value={hiddenContext} onChange={e=>setHiddenContext(e.target.value)}/>
      <Button variant="secondary" className="mt-3 w-full" onClick={customScenario}>Начать свой сценарий</Button>
      <p className="mt-4 text-xs leading-5 text-slate-500">LLM видит диагноз, симптомы, red flags и скрытый контекст каждый ход. Студент видит только вводную и может задавать любые вопросы.</p>
    </aside>
    <section className="rounded-2xl border border-white/10 bg-[#162320] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4"><UserRound className="text-teal-300"/><div><h2 className="font-semibold">Приём пациента</h2><p className="mt-1 text-xs text-slate-500">{publicBrief}</p></div></div>
      <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">{dialogue.map((m,i)=><div key={i} className={`max-w-[86%] rounded-2xl p-4 text-sm leading-6 ${m.speaker==='doctor'?'ml-auto bg-teal-500/15 text-teal-50':'bg-white/7 text-slate-200'}`}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{roleLabel(m.speaker)}</span>{m.text}</div>)}{loading&&<div className="rounded-2xl bg-white/7 p-4 text-sm text-slate-400">Пациент отвечает...</div>}</div>
      <div className="mt-5 flex gap-2"><input className="input border-white/10 bg-white/5 text-white" value={message} placeholder="Задайте любой вопрос пациенту..." onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}}/><Button onClick={ask} disabled={loading}><Send size={17}/></Button></div>
      <textarea readOnly className="input mt-4 min-h-36 border-white/10 bg-white/5 text-sm leading-6 text-slate-200" value={clinicalText}/>
    </section>
    <aside className="space-y-5">
      <ChoicePanel title="Диагнозы: выберите возможные" options={diagnosisOptions} selected={selectedDx} onToggle={value=>toggle(value,selectedDx,setSelectedDx)}/>
      <ChoicePanel title="Тактика и лечение" options={treatmentOptions} selected={selectedPlan} onToggle={value=>toggle(value,selectedPlan,setSelectedPlan)}/>
      <Button className="w-full" onClick={evaluate} disabled={evaluating}><ClipboardCheck size={17}/>{evaluating?'Оцениваю...':'Проверить выбор'}</Button>
      {feedback&&<div className="rounded-2xl border border-teal-400/20 bg-teal-400/8 p-4 text-sm leading-6 text-teal-50 whitespace-pre-line">{feedback}<p className="mt-3 text-xs text-slate-400">Эталон под капотом: {scenario.diagnosis}</p></div>}
    </aside>
  </div>;
}

function ChoicePanel({title,options,selected,onToggle}:{title:string;options:string[];selected:string[];onToggle:(value:string)=>void}){return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{options.map(option=><label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-5 ${selected.includes(option)?'border-teal-400/40 bg-teal-400/10 text-teal-50':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'}`}><input type="checkbox" className="mt-1" checked={selected.includes(option)} onChange={()=>onToggle(option)}/><span>{option}</span></label>)}</div></section>}

function unique(values:string[]){return [...new Set(values.filter(Boolean))];}

function localEvaluate(caseContext:SimCase,selectedDiagnoses:string[],selectedPlan:string[]){
  const missedDx=caseContext.expectedDiagnoses.filter(item=>!selectedDiagnoses.some(value=>sameCode(value,item)));
  const missedPlan=caseContext.expectedPlan.filter(item=>!selectedPlan.includes(item)).slice(0,4);
  const dangerous=selectedPlan.filter(item=>caseContext.unsafePlan.includes(item));
  return [
    missedDx.length?`Диагноз требует доработки: не выбран ${missedDx.join(', ')}.`:'Диагноз выбран близко к эталону.',
    missedPlan.length?`В плане не хватает: ${missedPlan.join('; ')}.`:'План в целом покрывает ключевую тактику.',
    dangerous.length?`Опасные решения: ${dangerous.join('; ')}.`:'Явных опасных решений в выбранном плане нет.',
  ].join('\n');
}

function sameCode(a:string,b:string){
  const left=a.split(' ')[0].toLowerCase();
  const right=b.split(' ')[0].toLowerCase();
  return left===right || a.toLowerCase().includes(right) || b.toLowerCase().includes(left);
}

function VoicePanel(){
  const recorder=useRef<MediaRecorder|null>(null);
  const chunks=useRef<Blob[]>([]);
  const [recording,setRecording]=useState(false);
  const [loading,setLoading]=useState(false);
  const [turns,setTurns]=useState<DialogueTurn[]>([]);
  const [error,setError]=useState('');

  async function start(){
    setError('');
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks.current=[];
    recorder.current=new MediaRecorder(stream);
    recorder.current.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
    recorder.current.onstop=async()=>{stream.getTracks().forEach(x=>x.stop());await upload(new Blob(chunks.current,{type:'audio/webm'}));};
    recorder.current.start();
    setRecording(true);
  }
  function stop(){recorder.current?.stop();setRecording(false);}
  async function upload(blob:Blob){
    setLoading(true);
    try{
      const form=new FormData();
      form.append('audio',blob,'consultation.webm');
      const response=await fetch('/api/transcribe',{method:'POST',body:form});
      if(!response.ok)throw new Error(await response.text());
      const data=await response.json();
      setTurns(data.turns??[]);
    }catch(e){setError(e instanceof Error?e.message:'Ошибка транскрибации');}
    finally{setLoading(false);}
  }
  return <div className="grid gap-5 py-6 lg:grid-cols-[380px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-white/10 bg-[#162320] p-5"><div className="flex items-center gap-3 border-b border-white/10 pb-4"><FileAudio className="text-teal-300"/><h2 className="font-semibold">Запись приёма</h2></div><div className="mt-6 grid aspect-square place-items-center rounded-3xl border border-white/10 bg-white/[.03]"><button onClick={recording?stop:start} className={`focus-ring grid size-32 place-items-center rounded-full ${recording?'bg-red-500 text-white':'bg-teal-500 text-slate-950'}`}>{recording?<Square size={42}/>:<Mic size={46}/>}</button></div><p className="mt-5 text-sm leading-6 text-slate-400">OpenAI STT распознаёт речь и diarization разделяет спикеров. Затем роли врача/пациента нормализуются для клинического диалога.</p>{loading&&<p className="mt-4 flex items-center gap-2 text-teal-300"><Loader2 className="animate-spin" size={16}/>Расшифровка...</p>}{error&&<p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}</aside>
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-2xl font-semibold">Диалог с ролями</h2><div className="mt-5 space-y-3">{turns.length?turns.map((t,i)=><div key={`${i}-${t.text}`} className="rounded-xl bg-white/5 p-4"><div className="text-xs font-bold uppercase text-teal-300">{roleLabel(t.speaker)} {typeof t.start==='number'?`· ${t.start.toFixed(1)}s`:''}</div><p className="mt-2 leading-6 text-slate-200">{t.text}</p></div>):<div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-white/10 text-slate-500">Запишите или загрузите аудио приёма</div>}</div></section>
  </div>;
}

function roleLabel(role:DialogueTurn['speaker']){return {doctor:'Врач',patient:'Пациент',relative:'Родственник',nurse:'Медсестра',unknown:'Спикер'}[role];}
