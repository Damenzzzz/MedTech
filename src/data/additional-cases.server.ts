import 'server-only';

/* Additional seed data: 17 more cases across all 8 specialties. Combined with the 15 existing cases, this provides 32 total synthetic cases. */

export type AdditionalSeed = {
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

export const additionalSeeds: AdditionalSeed[] = [
  // --- CARDIOLOGY (2 more → total 4) ---
  {
    id: 'af-new-onset',
    specialty: 'cardiology',
    name: ['Гульнара Темирбаева', 'Гүлнара Темірбаева', 'Gulnara Temirbayeva'],
    age: 64,
    sex: 'female',
    title: ['Учащённое сердцебиение', 'Жүрек соғысы жиілеуі', 'Palpitations'],
    complaint: ['Нерегулярное сердцебиение три дня', 'Үш күн нерегулярлы жүрек соғысы', 'Irregular heartbeat for three days'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['I48.0', 'Фибрилляция предсердий', 'Жүрекше фибрилляциясы', 'Atrial fibrillation'],
    facts: [
      ['onset', 'Почувствовала три дня назад утром', 'Үш күн бұрын таңертең сезді', 'Felt it three mornings ago'],
      ['dyspnea', 'Одышка при подъёме по лестнице', 'Баспалдақпен көтерілгенде ентігу', 'Dyspnea climbing stairs'],
      ['thyroid', 'Принимает L-тироксин', 'L-тироксин қабылдайды', 'Takes L-thyroxine'],
    ],
    vitals: [134, '142/88', 20, 36.7, 95],
  },
  {
    id: 'heart-failure',
    specialty: 'cardiology',
    name: ['Бауыржан Касенов', 'Бауыржан Қасенов', 'Baurzhan Kasenov'],
    age: 72,
    sex: 'male',
    title: ['Нарастающая одышка', 'Ентігудің күшеюі', 'Worsening dyspnea'],
    complaint: ['Не может лежать горизонтально, отёки ног', 'Жатып жата алмайды, аяқтары ісінген', 'Cannot lie flat, leg edema'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['I50.0', 'Хроническая сердечная недостаточность, декомпенсация', 'Созылмалы жүрек жетіспеушілігі, декомпенсация', 'Decompensated heart failure'],
    facts: [
      ['orthopnea', 'Спит на трёх подушках', 'Үш жастықта ұйықтайды', 'Sleeps on three pillows'],
      ['weight', 'Набрал 4 кг за неделю', 'Бір аптада 4 кг салмақ қосты', 'Gained 4 kg in a week'],
      ['meds', 'Прекратил пить фуросемид', 'Фуросемидті тоқтатты', 'Stopped taking furosemide'],
    ],
    vitals: [98, '158/94', 26, 36.6, 90],
  },

  // --- NEUROLOGY (2 more → total 4) ---
  {
    id: 'stroke-ischemic',
    specialty: 'neurology',
    name: ['Кайрат Жумагалиев', 'Қайрат Жұмағалиев', 'Kairat Zhumagaliyev'],
    age: 59,
    sex: 'male',
    title: ['Нарушение речи', 'Сөйлеу бұзылысы', 'Speech disturbance'],
    complaint: ['Внезапно перестал говорить, слабость справа', 'Кенеттен сөйлеуді тоқтатты, оң жақ әлсіздік', 'Sudden speech loss and right-sided weakness'],
    urgency: 'emergency',
    difficulty: 'hard',
    diagnosis: ['I63.9', 'Ишемический инсульт', 'Ишемиялық инсульт', 'Ischemic stroke'],
    facts: [
      ['time', 'Симптомы час назад', 'Белгілер бір сағат бұрын пайда болды', 'Symptoms began one hour ago'],
      ['face', 'Правый угол рта опущен', 'Ауыздың оң жақ бұрышы төмен түскен', 'Right mouth corner droops'],
      ['af', 'У него фибрилляция предсердий', 'Жүрекше фибрилляциясы бар', 'Has atrial fibrillation'],
    ],
    vitals: [92, '178/102', 18, 36.8, 96],
  },
  {
    id: 'migraine-aura',
    specialty: 'neurology',
    name: ['Дария Сарсенбаева', 'Дария Сәрсенбаева', 'Dariya Sarsenbayeva'],
    age: 26,
    sex: 'female',
    title: ['Мигрень с аурой', 'Аурамен мигрень', 'Migraine with aura'],
    complaint: ['Зигзаги перед глазами, затем сильная головная боль', 'Көз алдында зигзагтар, содан кейін қатты бас ауыруы', 'Visual zigzags followed by severe headache'],
    urgency: 'routine',
    difficulty: 'easy',
    diagnosis: ['G43.1', 'Мигрень с аурой', 'Аурамен мигрень', 'Migraine with aura'],
    facts: [
      ['aura', 'Мерцающие зигзаги 20 минут', '20 минут жарқылдаған зигзагтар', 'Scintillating zigzags for 20 minutes'],
      ['triggers', 'Стресс на работе и мало спала', 'Жұмыстағы стресс және аз ұйықтады', 'Work stress and poor sleep'],
      ['family', 'У мамы тоже мигрень', 'Анасында да мигрень бар', 'Mother also has migraines'],
    ],
    vitals: [78, '118/72', 16, 36.5, 99],
  },

  // --- PULMONOLOGY (2 more → total 4) ---
  {
    id: 'copd-exacerbation',
    specialty: 'pulmonology',
    name: ['Ержан Дуйсенбеков', 'Ержан Дүйсенбеков', 'Yerzhan Duisenbekov'],
    age: 63,
    sex: 'male',
    title: ['Обострение ХОБЛ', 'СООА өршуі', 'COPD exacerbation'],
    complaint: ['Нарастающая одышка и гнойная мокрота', 'Күшейген ентігу және іріңді қақырық', 'Worsening dyspnea and purulent sputum'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['J44.1', 'Обострение ХОБЛ', 'СООА өршуі', 'COPD exacerbation'],
    facts: [
      ['baseline', 'Давно одышка при нагрузке', 'Ұзақ уақыт жүктемеде ентігу', 'Long-standing exertional dyspnea'],
      ['sputum', 'Мокрота стала зелёной', 'Қақырық жасылға айналды', 'Sputum turned green'],
      ['smoking', 'Курит 40 лет', '40 жыл темекі шегеді', 'Smokes for 40 years'],
    ],
    vitals: [100, '136/82', 28, 37.2, 88],
  },
  {
    id: 'pe',
    specialty: 'pulmonology',
    name: ['Камила Есенова', 'Камила Есенова', 'Kamila Yesenova'],
    age: 38,
    sex: 'female',
    title: ['Лёгочная эмболия', 'Өкпе эмболиясы', 'Pulmonary embolism'],
    complaint: ['Внезапная одышка и боль в груди при дыхании', 'Кенеттен ентігу және тыныс алғанда кеуде ауыруы', 'Sudden dyspnea and pleuritic chest pain'],
    urgency: 'emergency',
    difficulty: 'hard',
    diagnosis: ['I26.9', 'Лёгочная эмболия', 'Өкпе эмболиясы', 'Pulmonary embolism'],
    facts: [
      ['risk', 'Принимает оральные контрацептивы', 'Пероралды контрацептивтер қабылдайды', 'Takes oral contraceptives'],
      ['flight', 'Вернулась из длительного перелёта', 'Ұзақ ұшудан қайтты', 'Returned from a long flight'],
      ['leg', 'Левая голень отёкшая и болит', 'Сол балтыры ісінген және ауырады', 'Left calf swollen and painful'],
    ],
    vitals: [118, '108/68', 28, 37.0, 89],
  },

  // --- GASTROENTEROLOGY (2 more → total 4) ---
  {
    id: 'cholecystitis',
    specialty: 'gastroenterology',
    name: ['Алмагуль Нургалиева', 'Алмагүл Нұрғалиева', 'Almagul Nurgaliyeva'],
    age: 48,
    sex: 'female',
    title: ['Острый холецистит', 'Жедел холецистит', 'Acute cholecystitis'],
    complaint: ['Сильная боль в правом подреберье после жирной еды', 'Майлы тамақтан кейін оң қабырға астындағы қатты ауырсыну', 'Severe right upper quadrant pain after fatty meal'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['K81.0', 'Острый холецистит', 'Жедел холецистит', 'Acute cholecystitis'],
    facts: [
      ['murphy', 'Боль усиливается при глубоком вдохе', 'Терең тыныс алғанда ауырсыну күшейеді', 'Pain worsens with deep inspiration'],
      ['nausea', 'Тошнота и однократная рвота', 'Жүрек айну және бір рет құсу', 'Nausea and one episode of vomiting'],
      ['stones', 'Раньше находили камни в желчном', 'Бұрын өт қабындағы тастар табылған', 'Known gallstones'],
    ],
    vitals: [96, '138/84', 20, 38.2, 98],
  },
  {
    id: 'pancreatitis',
    specialty: 'gastroenterology',
    name: ['Бекзат Ибрагимов', 'Бекзат Ибрагимов', 'Bekzat Ibragimov'],
    age: 41,
    sex: 'male',
    title: ['Острый панкреатит', 'Жедел панкреатит', 'Acute pancreatitis'],
    complaint: ['Опоясывающая боль в верхней части живота', 'Іштің жоғарғы бөлігінде белбеулеуші ауырсыну', 'Epigastric pain radiating to the back'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['K85.9', 'Острый панкреатит', 'Жедел панкреатит', 'Acute pancreatitis'],
    facts: [
      ['alcohol', 'Употреблял алкоголь несколько дней', 'Бірнеше күн алкоголь ішті', 'Drank alcohol for several days'],
      ['posture', 'Легче в положении сидя с наклоном', 'Отырып еңкейгенде жеңілдейді', 'Relief when sitting and leaning forward'],
      ['vomiting', 'Многократная рвота', 'Бірнеше рет құсу', 'Repeated vomiting'],
    ],
    vitals: [108, '128/78', 22, 37.8, 97],
  },

  // --- ENDOCRINOLOGY (2 more → total 4) ---
  {
    id: 'thyrotoxicosis',
    specialty: 'endocrinology',
    name: ['Асем Токтаганова', 'Әсем Тоқтағанова', 'Assem Toktaganova'],
    age: 33,
    sex: 'female',
    title: ['Тиреотоксикоз', 'Тиреотоксикоз', 'Thyrotoxicosis'],
    complaint: ['Сердцебиение, потеря веса и дрожь в руках', 'Жүрек соғысы, салмақ жоғалтуы және қолдардың дірілі', 'Palpitations, weight loss and tremor'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['E05.0', 'Тиреотоксикоз при диффузном зобе', 'Диффузды зоб кезіндегі тиреотоксикоз', 'Thyrotoxicosis with diffuse goiter'],
    facts: [
      ['weight', 'Похудела на 7 кг за два месяца', 'Екі айда 7 кг арықтады', 'Lost 7 kg in two months'],
      ['heat', 'Постоянно жарко, потеет', 'Үнемі ыстық, терлейді', 'Always hot and sweaty'],
      ['eyes', 'Глаза стали выпуклыми', 'Көздері бұлтиып тұр', 'Eyes are bulging'],
    ],
    vitals: [116, '146/72', 20, 37.2, 99],
  },
  {
    id: 'hypothyroid-myxedema',
    specialty: 'endocrinology',
    name: ['Ерлан Мухамеджанов', 'Ерлан Мухамеджанов', 'Yerlan Mukhamedzhanov'],
    age: 55,
    sex: 'male',
    title: ['Гипотиреоз', 'Гипотиреоз', 'Hypothyroidism'],
    complaint: ['Усталость, запоры и набор веса', 'Шаршау, іш қату және салмақ қосу', 'Fatigue, constipation and weight gain'],
    urgency: 'routine',
    difficulty: 'easy',
    diagnosis: ['E03.9', 'Гипотиреоз', 'Гипотиреоз', 'Hypothyroidism'],
    facts: [
      ['cold', 'Всё время мёрзнет', 'Үнемі тоңады', 'Constantly feeling cold'],
      ['skin', 'Кожа стала сухой', 'Терісі құрғады', 'Skin is dry'],
      ['voice', 'Голос стал хриплым', 'Дауысы бұзылды', 'Voice has become hoarse'],
    ],
    vitals: [56, '108/68', 14, 35.8, 98],
  },

  // --- INFECTIOUS (2 more → total 4) ---
  {
    id: 'influenza',
    specialty: 'infectious',
    name: ['Марат Естемесов', 'Марат Естемесов', 'Marat Yestemessov'],
    age: 35,
    sex: 'male',
    title: ['Грипп', 'Тұмау', 'Influenza'],
    complaint: ['Высокая температура, ломота во всём теле и головная боль', 'Жоғары қызба, бүкіл дененің ауыруы және бас ауыруы', 'High fever, body aches and headache'],
    urgency: 'routine',
    difficulty: 'easy',
    diagnosis: ['J10.1', 'Грипп', 'Тұмау', 'Influenza'],
    facts: [
      ['onset', 'Заболел вчера вечером внезапно', 'Кеше кешке кенеттен ауырды', 'Fell ill suddenly yesterday evening'],
      ['myalgia', 'Болят мышцы ног и спины', 'Аяқ пен арқа бұлшықеттері ауырады', 'Leg and back muscles ache'],
      ['contact', 'Коллеги на работе болеют', 'Жұмыстағы әріптестері ауырады', 'Colleagues at work are ill'],
    ],
    vitals: [100, '118/72', 20, 39.2, 97],
  },
  {
    id: 'sepsis',
    specialty: 'infectious',
    name: ['Нургуль Бекетова', 'Нұргүл Бекетова', 'Nurgul Beketova'],
    age: 68,
    sex: 'female',
    title: ['Сепсис', 'Сепсис', 'Sepsis'],
    complaint: ['Спутанность, лихорадка и низкое давление', 'Сана шатасуы, қызба және төмен қысым', 'Confusion, fever and low blood pressure'],
    urgency: 'emergency',
    difficulty: 'hard',
    diagnosis: ['A41.9', 'Сепсис', 'Сепсис', 'Sepsis'],
    facts: [
      ['source', 'Был пролежень на крестце', 'Сегізкөзде жатақ жара болды', 'Had a sacral pressure ulcer'],
      ['altered', 'Перестала узнавать близких', 'Жақындарын тани алмай қалды', 'Stopped recognizing family'],
      ['output', 'Мочи почти нет', 'Зәр шығару дерлік жоқ', 'Almost no urine output'],
    ],
    vitals: [124, '78/48', 28, 39.4, 91],
  },

  // --- EMERGENCY (2 more → total 4) ---
  {
    id: 'renal-colic',
    specialty: 'emergency',
    name: ['Азамат Жаксылыков', 'Азамат Жақсылықов', 'Azamat Zhaksylykov'],
    age: 36,
    sex: 'male',
    title: ['Почечная колика', 'Бүйрек тұтқышы', 'Renal colic'],
    complaint: ['Резкая боль в пояснице справа, отдаёт в пах', 'Оң жақ белдің күрт ауыруы, шапқа тарайды', 'Sharp right flank pain radiating to groin'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['N23', 'Почечная колика', 'Бүйрек тұтқышы', 'Renal colic'],
    facts: [
      ['onset', 'Началось внезапно час назад', 'Бір сағат бұрын кенеттен басталды', 'Started suddenly one hour ago'],
      ['hematuria', 'Моча красноватая', 'Зәр қызғылт', 'Reddish urine'],
      ['movement', 'Не может найти удобное положение', 'Ыңғайлы жағдай таба алмайды', 'Cannot find a comfortable position'],
    ],
    vitals: [102, '148/88', 22, 36.8, 98],
  },
  {
    id: 'status-epilepticus',
    specialty: 'emergency',
    name: ['Жанибек Молдахметов', 'Жанібек Молдахметов', 'Zhanibek Moldakhmetov'],
    age: 20,
    sex: 'male',
    title: ['Эпилептический статус', 'Эпилептикалық статус', 'Status epilepticus'],
    complaint: ['Повторные судороги без восстановления сознания', 'Сананы қалпына келтірмей қайталанатын құрысулар', 'Repeated seizures without regaining consciousness'],
    urgency: 'emergency',
    difficulty: 'hard',
    diagnosis: ['G41.0', 'Эпилептический статус', 'Эпилептикалық статус', 'Status epilepticus'],
    facts: [
      ['meds', 'Прекратил карбамазепин два дня назад', 'Екі күн бұрын карбамазепинді тоқтатты', 'Stopped carbamazepine two days ago'],
      ['duration', 'Судороги уже 15 минут', 'Құрысулар 15 минуттан бері', 'Seizures ongoing for 15 minutes'],
      ['witness', 'Мама вызвала скорую', 'Анасы жедел жәрдемді шақырды', 'Mother called the ambulance'],
    ],
    vitals: [130, '160/100', 32, 38.0, 92],
  },

  // --- THERAPY (2 more → total 4) ---
  {
    id: 'dvt',
    specialty: 'therapy',
    name: ['Зауреш Кенжебаева', 'Зауреш Кенжебаева', 'Zauresh Kenzhebayeva'],
    age: 52,
    sex: 'female',
    title: ['Тромбоз глубоких вен', 'Терең вена тромбозы', 'Deep vein thrombosis'],
    complaint: ['Отёк и боль в левой ноге', 'Сол аяқтың ісінуі және ауыруы', 'Swelling and pain in the left leg'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['I80.2', 'Тромбоз глубоких вен голени', 'Балтырдың терең вена тромбозы', 'Deep vein thrombosis of the calf'],
    facts: [
      ['immobility', 'Две недели на постельном режиме после операции', 'Операциядан кейін екі апта төсек режимінде', 'Two weeks of bed rest after surgery'],
      ['asymmetry', 'Левая голень толще правой на 3 см', 'Сол балтыры оң жақтан 3 см қалың', 'Left calf 3 cm larger than right'],
      ['redness', 'Кожа теплее и покрасневшая', 'Тері жылырақ және қызарған', 'Skin is warmer and reddened'],
    ],
    vitals: [88, '128/78', 18, 37.1, 97],
  },
  {
    id: 'hypertension',
    specialty: 'therapy',
    name: ['Талгат Абдикаримов', 'Талғат Әбдікарімов', 'Talgat Abdikarimov'],
    age: 49,
    sex: 'male',
    title: ['Артериальная гипертензия', 'Артериялық гипертензия', 'Arterial hypertension'],
    complaint: ['Головные боли по утрам последний месяц', 'Соңғы ай бойы таңғы бас ауыруы', 'Morning headaches for the past month'],
    urgency: 'routine',
    difficulty: 'easy',
    diagnosis: ['I10', 'Эссенциальная гипертензия', 'Эссенциалды гипертензия', 'Essential hypertension'],
    facts: [
      ['diet', 'Ест много солёного', 'Тұзды тамақ көп жейді', 'High salt diet'],
      ['family', 'У отца был инсульт', 'Әкесінде инсульт болған', 'Father had a stroke'],
      ['exercise', 'Малоподвижный образ жизни', 'Қимылы аз өмір салты', 'Sedentary lifestyle'],
    ],
    vitals: [78, '162/98', 16, 36.6, 98],
  },

  // --- One extra to ensure 32+ (COVID-like viral) ---
  {
    id: 'covid-like',
    specialty: 'infectious',
    name: ['Динара Калиева', 'Динара Қалиева', 'Dinara Kaliyeva'],
    age: 44,
    sex: 'female',
    title: ['Вирусная пневмония', 'Вирустық пневмония', 'Viral pneumonia'],
    complaint: ['Температура, сухой кашель и потеря обоняния', 'Қызба, құрғақ жөтел және иісті сезбеу', 'Fever, dry cough and anosmia'],
    urgency: 'urgent',
    difficulty: 'medium',
    diagnosis: ['J12.8', 'Вирусная пневмония неуточнённая', 'Вирустық пневмония анықталмаған', 'Viral pneumonia, unspecified'],
    facts: [
      ['anosmia', 'Перестала чувствовать запахи', 'Иістерді сезбей қалды', 'Lost sense of smell'],
      ['contact', 'Муж болел неделю назад', 'Күйеуі бір апта бұрын ауырған', 'Husband was ill a week ago'],
      ['desaturation', 'SpO₂ снижается при ходьбе', 'Жүргенде SpO₂ төмендейді', 'SpO₂ drops on walking'],
    ],
    vitals: [96, '122/76', 24, 38.6, 92],
  },
];
