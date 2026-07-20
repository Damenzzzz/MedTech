import fs from 'fs';
import path from 'path';

const content = `import { CaseDefinition } from '@/domain/schemas';

function t(ru: string, kk: string, en: string) {
  return { ru, kk, en };
}

export const caseDefinitions: Record<string, CaseDefinition> = {
  // CARDIOLOGY
  'chest-pain': {
    correctDiagnosis: { code: 'I20.0', name: t('Нестабильная стенокардия (впервые возникшая)', 'Тұрақсыз стенокардия', 'Unstable angina'), required: true },
    differentials: [
      { code: 'I20.0', name: t('Нестабильная стенокардия', 'Тұрақсыз стенокардия', 'Unstable angina'), required: true },
      { code: 'I21.9', name: t('Острый инфаркт миокарда', 'Миокардтың жедел инфарктісі', 'Acute myocardial infarction') },
      { code: 'I30.9', name: t('Острый перикардит', 'Жедел перикардит', 'Acute pericarditis') },
      { code: 'I26.9', name: t('ТЭЛА (Тромбоэмболия легочной артерии)', 'ӨАТЭ', 'Pulmonary embolism') },
    ],
    examinations: [
      { id: 'chest_palpation', category: 'cardiovascular', label: t('Пальпация и аускультация грудной клетки', 'Кеуде торын пальпациялау', 'Chest palpation & auscultation'), result: t('Болезненности при пальпации нет. Тоны сердца ритмичные, 88 в мин.', 'Пальпацияда ауырсыну жоқ. ЖҮС 88 мин.', 'Non-tender to chest wall palpation. S1/S2 regular, no S3/S4.'), relevant: true },
      { id: 'lung_auscultation', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Везикулярное дыхание, хрипов нет. SpO2: 98%.', 'Везикулярлық тыныс, сырылдар жоқ.', 'Clear vesicular breath sounds, no crackles.'), relevant: true },
      { id: 'vitals_cardio', category: 'cardiovascular', label: t('Измерение АД и пульса', 'АД және пульс өлшеу', 'Vital signs'), result: t('АД: 145/90 мм рт.ст. Пульс: 88 в мин, ритмичный.', 'АД: 145/90 мм б.б. Пульс: 88 мин.', 'BP: 145/90 mmHg. Pulse 88 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'ecg_12_lead', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Горизонтальная депрессия сегмента ST на 1.5 мм в V4-V6.', 'V4-V6 тіркемелерінде ST сегментінің депрессиясы.', 'Horizontal ST depression 1.5 mm in V4-V6.'), cost: 2, delayMs: 0, indicated: true },
      { id: 'troponin_t_stat', category: 'laboratory', name: t('Высокочувствительный Тропонин T (0 ч / 2 ч)', 'Тропонин T', 'High-sensitivity Troponin T'), result: t('Тропонин T: 12 нг/л (Норма < 14 нг/л). Негативный результативный тест.', 'Тропонин T: 12 нг/л (Нормада).', 'Troponin T: 12 ng/L (Normal < 14 ng/L). negative.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'echo_cg', category: 'functional', name: t('Эхокардиография (ЭхоКГ)', 'Эхокардиограмма', 'Echocardiography'), result: t('ФВ ЛЖ 58%, локальная гипокинезия верхушечно-боковой стенки ЛЖ.', 'ФВ 58%, гипокинезия.', 'LVEF 58%, hypokinesis of apical-lateral segment.'), cost: 5, delayMs: 2000, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 7.2 х 10^9/л, Гемоглобин: 142 г/л.', 'Лейкоциттер: 7.2 х 10^9/л.', 'WBC: 7.2 x 10^9/L, Hb: 142 g/L.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Госпитализация в БИТ / Кардиореанимацию', 'БИТ-ке госпитализациялау', 'Admit to Cardiac Care Unit (CCU)'), t('Антиагрегантная и антикоагулянтная терапия', 'Антиагреганттық терапия', 'Dual antiplatelet + anticoagulation')],
      medications: [t('Аспирин 300 мг разжевать + Клопидогрел 300 мг', 'Аспирин 300 мг + Клопидогрел 300 мг', 'Aspirin 300 mg + Clopidogrel 300 mg loading'), t('Эноксапарин 1 мг/кг с/к 2 раза/сут', 'Эноксапарин 1 мг/кг т/а', 'Enoxaparin 1 mg/kg SC BID'), t('Нитроглицерин спрей 0.4 мг сублингвально при боли', 'Нитроглицерин спрей 0.4 мг', 'Nitroglycerin spray 0.4 mg SL PRN')],
      nonDrug: [t('Строгий постельный режим, оксигенотерапия при SpO2 < 90%', 'Төсек режимі', 'Strict bed rest, monitor cardiac rhythm')],
      disposition: t('Отделение интенсивной терапии кардиологии', 'Кардиореанимация', 'Cardiac ICU Admission'),
      followUp: t('Контроль тропонина через 3 часа, КАГ в первые 24 часа', '3 сағаттан кейін тропонин, 24 сағатта КАГ', 'Repeat hs-Troponin at 3 hrs, early invasive CAG'),
      redFlags: [t('Рецидивирующий болевой синдром, нарастание депрессии ST, рефрактерная гипотония', 'Ауырсынудың қайталануы', 'Recurrent ischemia, hemodynamic instability, VT/VF')],
    },
    expectedActions: ['ecg_12_lead', 'troponin_t_stat', 'dapt_aspirin_clopidogrel', 'heparin_or_enoxaparin'],
    dangerousActions: ['prescribe_nsaid_ibuprofen_increases_infarction_risk', 'discharge_home'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'hypertensive-crisis': {
    correctDiagnosis: { code: 'I16.0', name: t('Осложнённый гипертонический криз (Гипертензивная энцефалопатия)', 'Асқынған гипертониялық криз', 'Hypertensive emergency (encephalopathy)'), required: true },
    differentials: [
      { code: 'I16.0', name: t('Осложнённый гипертонический криз', 'Асқынған гипертониялық криз', 'Hypertensive emergency'), required: true },
      { code: 'I63.9', name: t('Ишемический инсульт', 'Ишемиялық инсульт', 'Ischemic stroke') },
      { code: 'I61.9', name: t('Геморрагический инсульт', 'Геморрагиялық инсульт', 'Hemorrhagic stroke') },
      { code: 'I10', name: t('Неосложнённый гипертонический криз', 'Асқынбаған гипертониялық криз', 'Urgent hypertension') },
    ],
    examinations: [
      { id: 'bp_measurement', category: 'cardiovascular', label: t('Двукратное измерение АД на обеих руках', 'Екі қолда АД өлшеу', 'BP measurement on both arms'), result: t('АД: 220/125 мм рт.ст. ЧСС: 96 в мин, ритмичный.', 'АД: 220/125 мм б.б. ЖҮС: 96 мин.', 'BP: 220/125 mmHg. HR: 96 bpm.'), relevant: true },
      { id: 'neurological_status', category: 'neurological', label: t('Оценка неврологического статуса и менингеальных знаков', 'Нейростатус бағалау', 'Neurological examination'), result: t('Оглушение (GCS 14), очаговой неврологической симптоматики нет. Нистагма нет.', 'Естің төмендеуі (GCS 14).', 'Somnolence (GCS 14), no focal deficits.'), relevant: true },
      { id: 'fundoscopy', category: 'neurological', label: t('Офтальмоскопия глазного дна', 'Көз түбін офтальмоскопиялау', 'Fundoscopy'), result: t('Отёк диска зрительного нерва, кровоизлияния в сетчатку (Ретинопатия 4 ст.).', 'Көру нерві дискісінің ісінуі.', 'Papilledema and flame hemorrhages.'), relevant: true },
    ],
    investigations: [
      { id: 'ct_head_crisis', category: 'imaging', name: t('КТ головного мозга без контраста', 'КТ бас миы', 'Head CT non-contrast'), result: t('Острых очаговых изменений и кровоизлияния не выявлено. Признаки отека мозга.', 'Қан құйылу табылған жоқ.', 'No acute intracranial hemorrhage or territorial infarction.'), cost: 6, delayMs: 1500, indicated: true },
      { id: 'ecg_crisis', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Признаки гипертрофии ЛЖ, перегрузка ЛЖ.', 'Сол қарынша гипертрофиясы.', 'Left ventricular hypertrophy with strain pattern.'), cost: 2, delayMs: 0, indicated: true },
      { id: 'creatinine_electrolytes', category: 'laboratory', name: t('Креатинин, Мочевина, Электролиты', 'Креатинин, электролиттер', 'Serum Creatinine & Electrolytes'), result: t('Креатинин: 142 мкмоль/л (Повышен), Калий: 4.1 ммоль/л.', 'Креатинин: 142 мкмоль/л.', 'Creatinine: 142 umol/L, Potassium: 4.1 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'urinalysis_crisis', category: 'laboratory', name: t('Общий анализ мочи', 'Жалпы зәр анализі', 'Urinalysis'), result: t('Протеинурия 1.0 г/л, микрогематурия.', 'Ақуыз 1.0 г/л.', 'Proteinuria 1.0 g/L, microhematuria.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Экстренная госпитализация в ОРИТ / БИТ', 'ОРИТ-ке шұғыл госпитализациялау', 'Immediate ICU / CCU admission'), t('Контролируемое снижение АД не более чем на 20-25% в 1-й час!', 'АД-ны алғашқы сағатта 20-25%-дан асырмай баяу төмендету!', 'Controlled BP reduction max 20-25% in 1st hour!')],
      medications: [t('Урапидил (Эбрантил) 12.5-25 мг в/в медленно или Нитропруссид натрия в/в инфузоматом', 'Урапидил 12.5-25 мг т/і', 'Urapidil 12.5-25 mg IV slow push OR Nitroglycerin IV infusion'), t('Никардипин / Лабеталол в/в капельно', 'Лабеталол т/і', 'Labetalol or Nicardipine IV infusion')],
      nonDrug: [t('Мониторинг АД каждые 5 минут, приподнятое изголовье кровати на 30 градусов', '5 минут сайын АД бақылау', 'Continuous invasive/non-invasive BP monitoring Q5M')],
      disposition: t('Отделение реанимации и интенсивной терапии', 'Реанимация бөлімшесі', 'ICU Admission'),
      followUp: t('Подбор пероральной комбинированной антигипертензивной терапии после стабилизации', 'Пероралы гипотензивті емді таңдау', 'Transition to oral multidrug antihypertensive regimen'),
      redFlags: [t('Резкое падение АД (риск ишемии мозга/миокарда!), возникновение судорог, анурии', 'АД-ның шұғыл төмендеп кетуі!', 'Excessive BP drop causing stroke/MI, seizures, acute renal failure')],
    },
    expectedActions: ['bp_measurement', 'ct_head_crisis', 'urapidil_or_labetalol_iv', 'controlled_bp_drop_25_percent'],
    dangerousActions: ['rapid_bp_reduction_to_normal_causes_ischemic_stroke', 'sublingual_nifedipine_capsule'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'af-new-onset': {
    correctDiagnosis: { code: 'I48.0', name: t('Впервые выявленная пароксизмальная фибрилляция предсердий', 'Алғаш рет анықталған жүрекшелер фибрилляциясы', 'New-onset atrial fibrillation'), required: true },
    differentials: [
      { code: 'I48.0', name: t('Фибрилляция предсердий', 'Жүрекше фибрилляциясы', 'Atrial fibrillation'), required: true },
      { code: 'I48.1', name: t('Трепетание предсердий', 'Жүрекше трепетаниесі', 'Atrial flutter') },
      { code: 'I47.1', name: t('Наджелудочковая пароксизмальная тахикардия', 'Пароксизмальды тахикардия', 'Supraventricular tachycardia') },
      { code: 'E05.9', name: t('Тиреотоксикоз (как причина аритмии)', 'Тиреотоксикоз', 'Thyrotoxicosis-induced AF') },
    ],
    examinations: [
      { id: 'pulse_deficit', category: 'cardiovascular', label: t('Аускультация сердца и подсчет дефицита пульса', 'Жүрек аускультациясы мен пульс дефициті', 'Heart auscultation & pulse deficit'), result: t('Тоны сердца неритмичные, разной громкости. ЧСС 138 в мин, пульс на лучевой артерии 114 в мин (Дефицит 24).', 'Аритмия, ЖҮС 138 мин, пульс 114 мин (Дефицит 24).', 'Irregularly irregular rhythm. HR 138 bpm, radial pulse 114 bpm (Pulse deficit 24).'), relevant: true },
      { id: 'hemodynamic_stability', category: 'cardiovascular', label: t('Оценка гемодинамической стабильности', 'Гемодинамиканы бағалау', 'Hemodynamic stability check'), result: t('АД 115/75 мм рт.ст. Признаков шока, отека легких и ангинозной боли нет.', 'АД 115/75 мм б.б. Тұрақты.', 'BP 115/75 mmHg. Hemodynamically stable, no pulmonary edema or ischemia.'), relevant: true },
      { id: 'thyroid_palp', category: 'general', label: t('Пальпация щитовидной железы', 'Қалқанша безді пальпациялау', 'Thyroid palpation'), result: t('Безболезненная, не увеличена.', 'Ауырсынусыз, үлкеймеген.', 'Non-tender, normal size.'), relevant: true },
    ],
    investigations: [
      { id: 'ecg_af', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Отсутствие зубцов P, нерегулярные интервалы R-R, волны f. ЧСС 135-140 в мин.', 'P тісшелері жоқ, нерегулярлы R-R интервалдары.', 'Absence of P waves, irregular R-R intervals, fibrillatory f-waves. HR ~135 bpm.'), cost: 2, delayMs: 0, indicated: true },
      { id: 'echo_af', category: 'functional', name: t('ЭхоКГ (Трансторакальная)', 'ЭхоКГ', 'Transthoracic Echocardiography'), result: t('Левое предсердие 41 мм (умерено расширено). Тромбов в полости ЛП не визуализируется.', 'Сол жүрекше 41 мм.', 'Left atrium 41 mm (mildly dilated), LVEF 55%, no overt thrombus.'), cost: 5, delayMs: 2000, indicated: true },
      { id: 'tsh_labs', category: 'laboratory', name: t('ТТГ, Свободный Т4', 'ТТГ, бос Т4', 'TSH, Free T4'), result: t('ТТГ: 2.1 мМЕ/л (Норма 0.4-4.0).', 'ТТГ: 2.1 мМЕ/л.', 'TSH: 2.1 mIU/L (Normal).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'electrolytes_potassium', category: 'laboratory', name: t('Калий, Магний сыворотки', 'Калий, магний', 'Serum Potassium & Magnesium'), result: t('Калий: 4.2 ммоль/л, Магний: 0.85 ммоль/л.', 'Калий: 4.2 ммоль/л, Магний: 0.85 ммоль/л.', 'Potassium: 4.2 mmol/L, Magnesium: 0.85 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Стратификация риска инсульта по шкале CHA2DS2-VASc и выбор стратегии контроля ЧСС', 'CHA2DS2-VASc бойынша инсульт қаупін бағалау', 'Risk stratify via CHA2DS2-VASc & rate control strategy'), t('Назначение ПОАК при CHA2DS2-VASc >= 1 у мужчин / >= 2 у женщин', 'ПОАК тағайындау', 'Initiate DOAC anticoagulation')],
      medications: [t('Бета-блокаторы (Метопролол 50 мг или Бизопролол 5 мг) или Дилтиазем/Верапамил в/в/перорально для контроля ЧСС < 110 в мин', 'Метопролол 50 мг немесе Бизопролол 5 мг ЧСС бақылау үшін', 'Beta-blocker (Metoprolol 50 mg or Bisoprolol 5 mg) for rate control < 110 bpm'), t('Ривароксабан 20 мг/сут или Апиксабан 5 мг 2 раза/сут', 'Ривароксабан 20 мг/тәул', 'Rivaroxaban 20 mg daily OR Apixaban 5 mg BID')],
      nonDrug: [t('Избегать алкоголя, кофеина, стрессов. Дневник самоконтроля пульса', 'Алкоголь мен кофеинді шектеу', 'Avoid alcohol/caffeine, pulse monitoring')],
      disposition: t('Госпитализация в кардиологический стационар при нестабильности или амбулаторно', 'Кардиологиялық стационар немесе амбулатория', 'Inpatient cardiology or urgent outpatient clinic'),
      followUp: t('Контроль ЭКГ и ЧСС через 2-4 недели, решение вопроса о кардиоверсии после 3 недель ПОАК', '2-4 аптадан кейін ЭКГ бақылау', 'Follow-up in 2-4 weeks; elective cardioversion after 3 weeks anticoagulation'),
      redFlags: [t('Гемодинамическая нестабильность (АД < 90/60, отек легких — показана ЭКСТРЕННАЯ ЭЛЕКТРОКАРДИОВЕРСИЯ!)', 'Гемодинамикалық тұрақсыздық — ШҰҒЫЛ КАРДИОВЕРСИЯ!', 'Hemodynamic collapse requires IMMEDIATE synchronized DC cardioversion!')],
    },
    expectedActions: ['ecg_af', 'cha2ds2_vasc_eval', 'rate_control_beta_blocker', 'doac_anticoagulation'],
    dangerousActions: ['rhythm_control_cardioversion_without_excluding_thrombus_or_3wk_anticoagulation', 'prescribe_aspirin_monotherapy_for_stroke_prevention_in_af'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'heart-failure': {
    correctDiagnosis: { code: 'I50.0', name: t('Хроническая сердечная недостаточность IIБ ст., ФК III (Обострение)', 'Созылмалы жүрек жетіспеушілігі IIБ ст., ФК III', 'Chronic heart failure decompensation, NYHA Class III'), required: true },
    differentials: [
      { code: 'I50.0', name: t('Декомпенсация ХСН', 'СЖЖ декомпенсациясы', 'Decompensated Heart Failure'), required: true },
      { code: 'J18.9', name: t('Внебольничная пневмония', 'Қауымдастықтан тыс пневмония', 'Community-acquired pneumonia') },
      { code: 'I26.9', name: t('ТЭЛА', 'ӨАТЭ', 'Pulmonary embolism') },
      { code: 'N18.9', name: t('Хроническая болезнь почек', 'Созылмалы бүйрек ауруы', 'Chronic kidney disease') },
    ],
    examinations: [
      { id: 'lung_crackles', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпе аускультациясы', 'Lung auscultation'), result: t('Влажные мелкопузырчатые хрипы в нижних отделах с обеих сторон (до лопаток). SpO2: 90% на воздухе.', 'Өкпенің төменгі бөліктерінде ылғалды сырылдар. SpO2 90%.', 'Bilateral basal moist crackles extending to mid-lung fields. SpO2 90%.'), relevant: true },
      { id: 'jvd_edema', category: 'cardiovascular', label: t('Набухание яремных вен и периферические отёки', 'Мойын веналарының ісінуі және аяқ ісінулері', 'Jugular venous distension & peripheral edema'), result: t('Положительный гепатоюгулярный рефлюкс, набухание яремных вен +4 см. Плотные отеки голеней и стоп (3+).', 'Мойын веналарының ісінуі, аяқтардың 3+ ісінуі.', 'JVD +4 cm above sternal angle, positive hepatojugular reflux, 3+ pitting ankle/shin edema.'), relevant: true },
      { id: 'liver_palpation', category: 'abdominal', label: t('Пальпация печени', 'Бауырды пальпациялау', 'Liver palpation'), result: t('Печень выступает из-под края реберной дуги на 3 см, плотно-эластичная, чувствительная.', 'Бауыр қабырға доғасынан 3 см шығып тұр.', 'Hepatomegaly 3 cm below costal margin, smooth tender edge.'), relevant: true },
    ],
    investigations: [
      { id: 'nt_probnp', category: 'laboratory', name: t('NT-proBNP (Мозговой натрийуретический пептид)', 'NT-proBNP', 'NT-proBNP assay'), result: t('NT-proBNP: 3450 пг/мл (Резко повышен > 300 пг/мл).', 'NT-proBNP: 3450 пг/мл (Шұғыл жоғары).', 'NT-proBNP: 3450 pg/mL (Markedly elevated).'), cost: 4, delayMs: 1000, indicated: true },
      { id: 'cxr_chf', category: 'imaging', name: t('Рентгенография органов грудной клетки', 'Кеуде ағзаларының рентгенографиясы', 'Chest X-ray'), result: t('Кардиомегалия (КТИ > 55%), венозный застой в малом круге, линии Керли B, двусторонний малый гидроторакс.', 'Кардиомегалия, өкпедегі венозды застой.', 'Cardiomegaly (CTR > 55%), pulmonary venous congestion, Kerley B lines, mild bilateral pleural effusion.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'echo_chf', category: 'functional', name: t('ЭхоКГ', 'ЭхоКГ', 'Echocardiography'), result: t('Фракция выброса ЛЖ 34% (ХСН нФВ), дилатация ЛП и ЛЖ, систолическое давление в ЛА 45 мм рт.ст.', 'Фракция выброса 34%, дилатация.', 'LVEF 34% (HFrEF), dilated LA & LV, PASP 45 mmHg.'), cost: 5, delayMs: 2000, indicated: true },
      { id: 'creatinine_potassium', category: 'laboratory', name: t('Креатинин, СКФ, Калий, Натрий сыворотки', 'Креатинин, калий, натрий', 'Creatinine, eGFR, K, Na'), result: t('Креатинин: 118 мкмоль/л, Калий: 4.6 ммоль/л, Натрий: 136 ммоль/л.', 'Креатинин: 118 мкмоль/л, Калий: 4.6 ммоль/л.', 'Creatinine: 118 umol/L, Potassium: 4.6 mmol/L, Sodium: 136 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Госпитализация в кардиологическое отделение, петлевые диуретики в/в', 'Кардиологияға госпитализациялау, т/і диуретиктер', 'Hospitalize to cardiology, IV loop diuretic therapy'), t('Назначение квадротерапии ХСН (АРНИ/иАПФ + Бета-блокатор + АМК + iSGLT2)', 'ХСН квадротерапиясын тағайындау', 'Initiate 4-pillar GDMT (ARNI/ACEi + Beta-blocker + MRA + SGLT2i)')],
      medications: [t('Фуросемид (Лазикс) 40-80 мг в/в струйно', 'Фуросемид 40-80 мг т/і', 'Furosemide 40-80 mg IV bolus'), t('Сакубитрил/Валсартан (Юперио) 24/26 мг 2 раза/сут или Эналаприл 5 мг 2 раза/сут', 'Юперио 24/26 мг 2 рет/тәул', 'Sacubitril/Valsartan 24/26 mg BID'), t('Спиронолактон 25 мг/сут + Дапаглифлозин 10 мг/сут', 'Спиронолактон 25 мг + Дапаглифлозин 10 мг', 'Spironolactone 25 mg daily + Dapagliflozin 10 mg daily')],
      nonDrug: [t('Ограничение жидкости до 1.5 л/сут, поваренной соли < 2 г/сут, ежедневное взвешивание', 'Сұйықтықты 1.5 л/тәул шектеу', 'Fluid restriction < 1.5 L/day, salt < 2 g/day, daily weight log')],
      disposition: t('Кардиологическое отделение стационара', 'Кардиология бөлімшесі', 'Inpatient Cardiology Ward'),
      followUp: t('Контроль массы тела, креатинина и калия через 1-2 недели', '1-2 аптада салмақ, креатинин, калий бақылау', 'Recheck weight, renal function, & electrolytes in 1-2 weeks'),
      redFlags: [t('Острый отек легких (розовая пенистая мокрота, тяжелое удушье), кардиогенный шок', 'Өкпе ісінуі, кардиогенді шок', 'Acute pulmonary edema (pink frothy sputum, severe hypoxia), cardiogenic shock')],
    },
    expectedActions: ['nt_probnp_test', 'chest_xray', 'iv_furosemide', 'four_pillar_hf_therapy'],
    dangerousActions: ['prescribe_verapamil_or_diltiazem_in_hfref', 'give_high_dose_beta_blocker_during_acute_uncompensated_congestion'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // NEUROLOGY
  'tia': {
    correctDiagnosis: { code: 'G45.9', name: t('Транзиторная ишемическая атака в бассейне левой СМА (ABCD2 = 5)', 'Сол жақ ортаңғы ми артериясы бассейніндегі ТИА', 'Transient ischemic attack (TIA), left MCA territory'), required: true },
    differentials: [
      { code: 'G45.9', name: t('Транзиторная ишемическая атака', 'Транзиторлы ишемиялық шабуыл', 'Transient ischemic attack'), required: true },
      { code: 'I63.9', name: t('Ишемический инсульт', 'Ишемиялық инсульт', 'Ischemic stroke') },
      { code: 'G43.1', name: t('Мигрень с аурой', 'Аурасы бар мигрень', 'Migraine with aura') },
      { code: 'E16.2', name: t('Гипогликемия', 'Гипогликемия', 'Hypoglycemia') },
    ],
    examinations: [
      { id: 'fast_exam', category: 'neurological', label: t('Неврологический осмотр по шкале FAST', 'FAST шкаласы бойынша тексеру', 'FAST neurological assessment'), result: t('Симптомы полностью регрессировали к моменту осмотра. Правосторонний гемипарез и афазия длились 35 минут.', 'Симптомдар 35 минуттан кейін толық кайта қалпына келді.', 'Focal neurological symptoms (right arm weakness & motor aphasia) completely resolved in 35 minutes.'), relevant: true },
      { id: 'carotid_bruit', category: 'cardiovascular', label: t('Аускультация сонных артерий', 'Уйқы артерияларын аускультациялау', 'Carotid artery auscultation'), result: t('Систолический шум над проекцией бифуркации левой сонной артерии.', 'Сол ұйқы артериясы үстінен систолалық шу.', 'Systolic carotid bruit heard over left carotid bifurcation.'), relevant: true },
      { id: 'bp_vitals_tia', category: 'cardiovascular', label: t('Измерение АД и ЧСС', 'АД және ЖҮС өлшеу', 'Vital signs'), result: t('АД 158/92 мм рт.ст., ЧСС 76 в мин, ритмичный.', 'АД 158/92 мм б.б., ЖҮС 76 мин.', 'BP 158/92 mmHg, HR 76 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'ct_head_tia', category: 'imaging', name: t('КТ головного мозга без контраста', 'КТ бас миы', 'Head CT non-contrast'), result: t('Острых очагов ишемии и кровоизлияния не обнаружено (Норма).', 'Өзгерістер табылған жоқ.', 'No acute intracranial hemorrhage or early ischemic changes.'), cost: 6, delayMs: 1500, indicated: true },
      { id: 'mri_dwi', category: 'imaging', name: t('МРТ головного мозга (DWI регресс)', 'Ми МРТ-сы (DWI)', 'Brain MRI with DWI'), result: t('Острых очагов ограничения диффузии не выявлено.', 'Диффузия шектелу ошақтары табылған жоқ.', 'No restricted diffusion on DWI (rules out acute infarction).'), cost: 8, delayMs: 3000, indicated: true },
      { id: 'duplex_carotid', category: 'functional', name: t('УЗДС сонных и позвоночных артерий', 'Ұйқы артерияларының УЗДС', 'Carotid duplex ultrasound'), result: t('Стеноз левой внутренней сонной артерии 65% за счет атеросклеротической бляшки.', 'Сол ішкі ұйқы артериясының 65% стенозы.', '65% stenosis of left internal carotid artery due to atheromatous plaque.'), cost: 4, delayMs: 2000, indicated: true },
      { id: 'glucose_bedside', category: 'laboratory', name: t('Экспресс-глюкометрия (Обязательно!)', 'Глюкометрия', 'Bedside blood glucose'), result: t('Глюкоза крови: 5.8 ммоль/л.', 'Қан глюкозасы: 5.8 ммоль/л.', 'Blood glucose: 5.8 mmol/L.'), cost: 1, delayMs: 0, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Срочная вторичная профилактика инсульта, оценка ABCD2 score = 5 (высокий риск)', 'Инсульттың шұғыл екіншілік алдын алу', 'Urgent stroke prevention, high ABCD2 score = 5'), t('Двойная антиагрегантная терапия (ДАТАТ) на 21 день', 'ДАТАТ 21 күнге', 'Dual Antiplatelet Therapy (DAPT) for 21 days')],
      medications: [t('Аспирин 100 мг/сут + Клопидогрел 75 мг/сут (нагрузочная доза 300 мг)', 'Аспирин 100 мг + Клопидогрел 75 мг', 'Aspirin 100 mg + Clopidogrel 75 mg daily (300 mg load)'), t('Аторвастатин 80 мг/сут (высокоинтенсивная статинотерапия)', 'Аторвастатин 80 мг/тәул', 'Atorvastatin 80 mg daily high-intensity statin')],
      nonDrug: [t('Консультация сосудистого хирурга / ангиохирурга по поводу каротидной эндартерэктомии', 'Сосудистый хирург консультациясы', 'Vascular surgery consult for carotid endarterectomy')],
      disposition: t('Инсультное отделение (Неврология) для 24-48 ч наблюдения', 'Инсульт бөлімшесі', 'Stroke Unit Admission for 24-48h monitoring'),
      followUp: t('Контроль УЗДС сонных артерий и Липидограммы через 1 месяц', '1 айдан кейін УЗДС бақылау', 'Carotid duplex & lipid panel re-check in 1 month'),
      redFlags: [t('Повторное возобновление очаговой неврологической симптоматики (Инсульт!)', 'Симптомдардың қайта оралуы', 'Recurrent neurological deficit indicating stroke evolution')],
    },
    expectedActions: ['glucose_check_exclude_hypo', 'head_ct_or_mri', 'dapt_aspirin_clopidogrel', 'carotid_ultrasound'],
    dangerousActions: ['discharge_without_neuroimaging_and_antiplatelet', 'excessive_bp_lowering_in_acute_phase'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'stroke-ischemic': {
    correctDiagnosis: { code: 'I63.3', name: t('Острый ишемический инсульт в бассейне правой СМА, терапевтическое окно 3.5 ч', 'Оң жақ ОМА бассейніндегі жедел ишемиялық инсульт', 'Acute ischemic stroke, right MCA territory'), required: true },
    differentials: [
      { code: 'I63.3', name: t('Ишемический инсульт', 'Ишемиялық инсульт', 'Ischemic stroke'), required: true },
      { code: 'I61.9', name: t('Геморрагический инсульт (Внутримозговое кровоизлияние)', 'Геморрагиялық инсульт', 'Hemorrhagic stroke') },
      { code: 'G45.9', name: t('ТИА', 'ТИА', 'TIA') },
      { code: 'E16.2', name: t('Гипогликемическая псевдоэнцефалопатия', 'Гипогликемия', 'Hypoglycemic mimic') },
    ],
    examinations: [
      { id: 'nihss_score', category: 'neurological', label: t('Оценка по шкале NIHSS', 'NIHSS шкаласы бойынша бағалау', 'NIHSS Stroke Scale rating'), result: t('NIHSS = 12 баллов: левосторонний гемипарез (3 б), сглаженность носогубной складки (2 б), гемианестезия (2 б), дизартрия (2 б), неглект (3 б).', 'NIHSS = 12 балл: сол жақтық гемипарез, дизартрия.', 'NIHSS = 12: left hemiparesis, facial palsy, dysarthria, left-sided hemisensory loss & neglect.'), relevant: true },
      { id: 'airway_vitals_stroke', category: 'general', label: t('Оценка сознания, прохода ДП и АД', 'Есті және АД бағалау', 'Airway, consciousness & BP'), result: t('Сознание ясное (GCS 15), АД 175/95 мм рт.ст., ЧСС 82 в мин, SpO2 97%.', 'Есі анық (GCS 15), АД 175/95 мм б.б.', 'Alert (GCS 15), BP 175/95 mmHg, HR 82 bpm, SpO2 97%.'), relevant: true },
      { id: 'meningism_check', category: 'neurological', label: t('Проверка менингеальных знаков', 'Менингеальды белгілерді тексеру', 'Meningeal signs check'), result: t('Ригидности затылочных мышц нет, Кернига теріс.', 'Шүйде бұлшықеттерінің ригидтілігі жоқ.', 'No neck stiffness, negative Kernig sign.'), relevant: true },
    ],
    investigations: [
      { id: 'ct_head_stat', category: 'imaging', name: t('КТ головного мозга без контраста (ЭКСТРЕННО!)', 'КТ бас миы (ШҰҒЫЛ!)', 'Emergency non-contrast Head CT'), result: t('Кровоизлияния нет! Ранние признаки ишемии в бассейне правой СМА (сглаженность борозд, ASPECT score = 8).', 'Қан құйылу жоқ! Оң жақ ОМА ишемия белгілері.', 'No intracranial hemorrhage. Early ischemic changes in right MCA territory, ASPECT score 8.'), cost: 6, delayMs: 1000, indicated: true },
      { id: 'glucose_stat', category: 'laboratory', name: t('Экспресс-глюкометрия (Критическое исключение!)', 'Экспресс-глюкометрия', 'Bedside blood glucose'), result: t('Глюкоза крови: 6.4 ммоль/л (Норма).', 'Қан глюкозасы: 6.4 ммоль/л.', 'Blood glucose: 6.4 mmol/L.'), cost: 1, delayMs: 0, indicated: true },
      { id: 'coagulation_stroke', category: 'laboratory', name: t('МНО, АЧТВ, Тромбоциты', 'ХҒҚ, АЧТВ, тромбоциттер', 'INR, aPTT, Platelet count'), result: t('МНО: 1.02, АЧТВ: 28 сек, Тромбоциты: 210 х 10^9/л.', 'ХҒҚ: 1.02, Тромбоциттер: 210 х 10^9/л.', 'INR: 1.02, aPTT: 28 sec, Platelets: 210 x 10^9/L.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'ecg_stroke', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Синусовый ритм 82 в мин, без острых ишемических изменений.', 'Синусты ритм 82 мин.', 'Sinus rhythm 82 bpm, no acute ST changes.'), cost: 2, delayMs: 0, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('ЭКСТРЕННАЯ ТРОМБОЛИТИЧЕСКАЯ ТЕРАПИЯ (ТЛТ) Альтеплазой в первые 4.5 часа!', 'ШҰҒЫЛ ТРОМБОЛИЗИС (Альтеплаза) алғашқы 4.5 сағатта!', 'EMERGENCY IV Thrombolysis (rtPA Alteplase) within 4.5-hour window!'), t('Госпитализация в инсультное отделение (БИТ)', 'Инсульт реанимациясына госпитализациялау', 'Admit to Stroke ICU')],
      medications: [t('Альтеплаза (Актилизе) 0.9 мг/кг (макс 90 мг): 10% в/в болюс за 1 мин, 90% в/в инфузоматом за 60 мин', 'Альтеплаза 0.9 мг/кг т/і (10% болюс, 90% инфузия)', 'Alteplase (rtPA) 0.9 mg/kg (max 90 mg): 10% IV bolus over 1 min, 90% IV infusion over 60 min')],
      nonDrug: [t('Не давать антиагреганты/антикоагулянты в первые 24 часа после ТЛТ! Контроль АД < 180/105 мм рт.ст.', 'Тромболизистен кейін 24 сағат антиагрегант бермеу!', 'NO antiplatelets/anticoagulants for 24 hours post-thrombolysis!')],
      disposition: t('Блок интенсивной терапии инсультного центра', 'Инсульт орталығының БИТ-і', 'Stroke ICU Admission'),
      followUp: t('Повторная КТ головного мозга через 24 часа для исключения геморрагической трансформации', '24 сағаттан кейін кайта КТ бақылау', 'Follow-up Head CT at 24 hours post-tPA'),
      redFlags: [t('Геморрагическая трансформация (резкая головная боль, падение сознания, нарастание неврологического дефицита)', 'Геморрагиялық трансформация', 'Hemorrhagic transformation or severe brain edema')],
    },
    expectedActions: ['glucose_check_stat', 'head_ct_stat_exclude_bleed', 'nihss_assessment', 'iv_thrombolysis_alteplase_within_window'],
    dangerousActions: ['administer_aspirin_before_ct_or_within_24h_of_tpa', 'excessive_bp_lowering_below_140_in_acute_phase'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'migraine': {
    correctDiagnosis: { code: 'G43.0', name: t('Мигрень без ауры, частые купируемые приступы', 'Аурасыз мигрень', 'Migraine without aura'), required: true },
    differentials: [
      { code: 'G43.0', name: t('Мигрень без ауры', 'Аурасыз мигрень', 'Migraine without aura'), required: true },
      { code: 'G44.2', name: t('Головная боль напряжения (ГБН)', 'Кернеулі бас ауыруы', 'Tension-type headache') },
      { code: 'G44.0', name: t('Кластерная (пучковая) головная боль', 'Кластерлік бас ауыруы', 'Cluster headache') },
      { code: 'I61.9', name: t('Субарахноидальное кровоизлияние (САК)', 'Субарахноидалды қан құйылу', 'Subarachnoid hemorrhage') },
    ],
    examinations: [
      { id: 'neuro_exam_migraine', category: 'neurological', label: t('Полный неврологический осмотр', 'Толық неврологиялық тексеру', 'Comprehensive neurological exam'), result: t('Очаговой неврологической симптоматики и менингеальных знаков нет. Правосторонний пульсирующий характер боли.', 'Ошақты симптомдар жоқ. Оң жақты пульсациялайтын бас ауыруы.', 'Normal neurological exam, no focal deficits or meningismus. Right-sided throbbing pain.'), relevant: true },
      { id: 'photo_phonophobia', category: 'neurological', label: t('Оценка фотофобии и фонофобии', 'Фотофобия мен фонофобияны бағалау', 'Photo/phonophobia evaluation'), result: t('Выраженная светобоязнь (фотофобия) и звукобоязнь (фонофобия), тошнота.', 'Айқын светобоязнь, тошнота.', 'Severe photophobia, phonophobia, nausea present.'), relevant: true },
      { id: 'bp_vitals_migraine', category: 'cardiovascular', label: t('Измерение АД и пульса', 'АД және пульс өлшеу', 'Vital signs'), result: t('АД 122/78 мм рт.ст., ЧСС 80 в мин.', 'АД 122/78 мм б.б.', 'BP 122/78 mmHg, HR 80 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'mri_brain_migraine', category: 'imaging', name: t('МРТ головного мозга (Для исключения органической патологии)', 'Ми МРТ-сы', 'Brain MRI'), result: t('Очаговых изменений паренхимы мозга не выявлено. Норма.', 'Патология табылған жоқ.', 'Normal brain parenchyma, no structural space-occupying lesion.'), cost: 8, delayMs: 3000, indicated: false },
      { id: 'esr_crp', category: 'laboratory', name: t('СОЭ, СРБ (Исключить гигантоклеточный артериит)', 'ЭТЖ, СРБ', 'ESR & CRP (Exclude temporal arteritis)'), result: t('СОЭ: 10 мм/ч, СРБ: 2 мг/л (Норма).', 'ЭТЖ: 10 мм/сағ.', 'ESR: 10 mm/hr, CRP: 2 mg/L (Normal).'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'fundoscopy_migraine', category: 'functional', name: t('Офтальмоскопия глазного дна', 'Көз түбін тексеру', 'Fundoscopy'), result: t('Диски зрительных нервов четкие, отёка нет.', 'Көру нерві дискілері анық.', 'Optic discs sharp, no papilledema.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'cbc_migraine', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 6.8 х 10^9/л, Гемоглобин: 135 г/л.', 'Лейкоциттер: 6.8 х 10^9/л.', 'WBC: 6.8 x 10^9/L, Hb: 135 g/L.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Купирование острого приступа мигрени в первые 30 минут', 'Алғашқы 30 минутта мигрень ұстамасын басу', 'Acute migraine attack relief within early 30-min window'), t('Профилактическая терапия при частоте приступов > 2-4 раз в месяц', 'Приступтер жиі болса алдын алу терапиясы', 'Prophylactic therapy if > 2-4 disabling attacks per month')],
      medications: [t('Триптаны (Суматриптан 50-100 мг или Золмитриптан 2.5 мг) или НПВП (Ибупрофен 400-800 мг / Напроксен 500 мг)', 'Суматриптан 50-100 мг немесе Ибупрофен 400-800 мг', 'Sumatriptan 50-100 mg PO OR Naproxen 500 mg at onset'), t('Метоклопрамид 10 мг перорально/в/м при выраженной тошноте', 'Метоклопрамид 10 мг', 'Metoclopramide 10 mg for nausea & motility')],
      nonDrug: [t('Темная тихая комната, холодный компресс на лоб, избегать триггеров (сыр, шоколад, недосыпание)', 'Қараңғы тыныш бөлме, салқын компресс', 'Rest in dark quiet room, cold forehead compress, trigger identification')],
      disposition: t('Амбулаторное наблюдение у невролога', 'Неврологта амбулаториялық бақылау', 'Outpatient neurology care'),
      followUp: t('Ведение дневника головной боли в течение 1-2 месяцев', '1-2 ай бойы бас ауруы күнделігін жүргізу', 'Headache diary tracking for 1-2 months'),
      redFlags: [t('Громоподобная головная боль ("взрыв в голове"), лихорадка с менингизмом, очаговый дефицит', '«Найзағай тәрізді» кенеттен ауырсыну!', 'Thunderclap onset ("worst headache of life"), meningism, focal neuro deficit')],
    },
    expectedActions: ['neuro_exam_migraine', 'triptan_or_nsaid_start', 'headache_diary_recommendation'],
    dangerousActions: ['prescribe_opioids_risk_of_dependence_and_medication_overuse_headache', 'miss_thunderclap_headache'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'migraine-aura': {
    correctDiagnosis: { code: 'G43.1', name: t('Мигрень с типичной зрительной аурой', 'Типті көру аурасы бар мигрень', 'Migraine with typical visual aura'), required: true },
    differentials: [
      { code: 'G43.1', name: t('Мигрень с аурой', 'Аурасы бар мигрень', 'Migraine with aura'), required: true },
      { code: 'G45.9', name: t('Транзиторная ишемическая атака (ТИА)', 'Транзиторлы ишемиялық шабуыл', 'TIA') },
      { code: 'G40.1', name: t('Простая парциальная затылочная эпилепсия', 'Желке эпилепсиясы', 'Occipital lobe epilepsy') },
    ],
    examinations: [
      { id: 'visual_field_exam', category: 'neurological', label: t('Оценка полей зрения и мерцающей скотомы', 'Көру өрістерін бағалау', 'Visual fields & scintillating scotoma check'), result: t('Преходящая мерцающая зигзагообразная скотома (гемианоптический циркуляр) длительностью 20 минут, сменившаяся пульсирующей гемикранией.', '20 минут созылған жыпылықтайтын скотома.', 'Scintillating fortification spectrum (zigzag lines) & homonymous scotoma lasting 20 min, followed by contralateral headache.'), relevant: true },
      { id: 'cranial_nerves', category: 'neurological', label: t('Осмотр черепно-мозговых нервов (ЧМН)', 'ЧМН тексеру', 'Cranial nerve evaluation'), result: t('ЧМН без патологии, движений глазных яблок в полном объеме. Парезов нет.', 'ЧМН патологиясыз.', 'Cranial nerves intact, no motor deficit.'), relevant: true },
      { id: 'vitals_aura', category: 'cardiovascular', label: t('АД и ЧСС', 'АД және ЖҮС', 'Vitals'), result: t('АД 120/75 мм рт.ст., ЧСС 74 в мин.', 'АД 120/75 мм б.б.', 'BP 120/75 mmHg, HR 74 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'mri_brain_aura', category: 'imaging', name: t('МРТ головного мозга с ангиографией', 'Ми МРТ-сы ангиографиямен', 'Brain MRI with MRA'), result: t('Патологических изменений в паренхиме мозга и сосудах не выявлено.', 'Ми мен тамырларда патология жоқ.', 'Normal brain parenchymal MRI and circle of Willis MRA.'), cost: 8, delayMs: 3000, indicated: true },
      { id: 'eeg_aura', category: 'functional', name: t('ЭЭГ (Рутинная)', 'ЭЭГ', 'Routine EEG'), result: t('Эпилептиформной активности не обнаружено.', 'Эпилептиформды белсенділік табылған жоқ.', 'No epileptiform sharp-wave discharges.'), cost: 4, delayMs: 2000, indicated: false },
      { id: 'glucose_aura', category: 'laboratory', name: t('Глюкоза крови', 'Қан глюкозасы', 'Blood glucose'), result: t('Глюкоза: 5.1 ммоль/л.', 'Глюкоза: 5.1 ммоль/л.', 'Blood glucose: 5.1 mmol/L.'), cost: 1, delayMs: 0, indicated: true },
      { id: 'cbc_aura', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 6.1 х 10^9/л, Гемоглобин: 138 г/л.', 'Лейкоциттер: 6.1 х 10^9/л.', 'WBC: 6.1 x 10^9/L, Hb: 138 g/L.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Разъяснить доброкачественную природу ауры, назначить триптаны ПОСЛЕ окончания ауры!', 'Аура аяқталғаннан КЕЙІН триптандарды тағайындау!', 'Educate patient, prescribe triptans to be taken AFTER aura phase at headache onset!'), t('Противопоказаны эстрогенсодержащие КОК у женщин с мигренью с аурой (риск ишемического инсульта!)', 'Аурасы бар мигреньде эстрогенді КОК қарсы көрсетілген!', 'COCs containing estrogen are CONTRAINDICATED (stroke risk!)')],
      medications: [t('Золмитриптан 2.5 мг или Элетриптан 40 мг при начале головной боли', 'Золмитриптан 2.5 мг бас ауыруы басталғанда', 'Zolmitriptan 2.5 mg or Eletriptan 40 mg at headache onset')],
      nonDrug: [t('Модификация образа жизни, исключение индивидуальных триггеров ауры', 'Өмір салтын өзгерту', 'Lifestyle modification & trigger avoidance')],
      disposition: t('Амбулаторное лечение у невролога', 'Амбулаториялық невролог бақылауы', 'Outpatient neurology care'),
      followUp: t('Контрольный визит через 1 месяц с дневником приступов', '1 айдан кейін бақылау', 'Follow-up in 1 month with headache diary'),
      redFlags: [t('Длительность ауры > 60 минут (Мигренозный инфаркт!), появление моторной слабости', 'Аура уақыты > 60 минут болса (Мигренозды инфаркт!)', 'Aura duration > 60 min (suspect motor aura or migrainous infarction)')],
    },
    expectedActions: ['visual_field_exam', 'mri_brain_aura', 'triptan_after_aura', 'contraindicate_estrogen_cocs'],
    dangerousActions: ['prescribe_estrogen_combination_oral_contraceptives', 'take_triptans_during_aura_phase_vasoconstriction_risk'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // PULMONOLOGY
  'pneumonia': {
    correctDiagnosis: { code: 'J18.1', name: t('Внебольничная правосторонняя нижнедолевая пневмония, среднетяжёлое течение (CURB-65 = 1)', 'Қауымдастықтан тыс оң жақ төменгі үлестік пневмония', 'Community-acquired right lower lobe pneumonia'), required: true },
    differentials: [
      { code: 'J18.1', name: t('Внебольничная пневмония', 'Қауымдастықтан тыс пневмония', 'Community-acquired pneumonia'), required: true },
      { code: 'J20.9', name: t('Острый бронхит', 'Жедел бронхит', 'Acute bronchitis') },
      { code: 'I26.9', name: t('ТЭЛА (Тромбоэмболия)', 'ӨАТЭ', 'Pulmonary embolism') },
      { code: 'A16.2', name: t('Инфильтративный туберкулез лёгких', 'Өкпе туберкулезі', 'Pulmonary tuberculosis') },
    ],
    examinations: [
      { id: 'lung_percussion_ausc', category: 'respiratory', label: t('Перкуссия и аускультация лёгких', 'Өкпені перкуссиялау және аускультациялау', 'Lung percussion & auscultation'), result: t('Укорочение перкуторного звука в нижней доле правого легкого. Бронхиальное дыхание, звучные мелкопузырчатые крепитирующие хрипы.', 'Оң өкпенің төменгі үлесінде перкуторлы дыбыстың тұйықталуы, крепитация.', 'Dullness to percussion at right lung base. Bronchial breath sounds & inspiratory crackles.'), relevant: true },
      { id: 'voice_tremor', category: 'respiratory', label: t('Оценка голосового дрожания', 'Дауыс дірілін бағалау', 'Tactile fremitus'), result: t('Усиление голосового дрожания и бронхофонии над правой нижней долей.', 'Оң жақ төменде дауыс дірілінің күшеюі.', 'Increased tactile fremitus & bronchophony right base.'), relevant: true },
      { id: 'spo2_pneumonia', category: 'respiratory', label: t('Пульсоксиметрия и ЧДД', 'Пульсоксиметрия және ТЖ', 'SpO2 & Respiratory rate'), result: t('SpO2: 94% на воздухе. ЧДД: 22 в мин.', 'SpO2: 94%, ТЖ: 22 мин.', 'SpO2: 94% room air. RR: 22 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'cxr_pneumonia', category: 'imaging', name: t('Рентгенография органов грудной клетки в 2 проекциях', 'Кеуде ағзаларының 2 проекциядағы рентгенографиясы', 'Chest X-ray (PA & Lateral)'), result: t('Интенсивное фокусное инфильтративное уплотнение легочной ткани в S8-S10 правого легкого.', 'Оң өкпенің S8-S10 аймағында ошақты инфильтрация.', 'Dense focal parenchymal consolidation in right lower lobe (S8-S10).'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_pneumonia', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоцитоз: 16.4 х 10^9/л, Палочкоядерный сдвиг: 12%, СОЭ: 45 мм/ч.', 'Лейкоцитоз 16.4 х 10^9/л, таяқшалар 12%, ЭТЖ 45 мм/сағ.', 'WBC: 16.4 x 10^9/L with left shift (bands 12%), ESR: 45 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'crp_pneumonia', category: 'laboratory', name: t('С-реактивный белок (СРБ)', 'С-реактивті ақуыз (СРБ)', 'C-Reactive Protein (CRP)'), result: t('СРБ: 112 мг/л (Норма < 5 мг/л) — выраженный воспалительный ответ.', 'СРБ: 112 мг/л.', 'CRP: 112 mg/L (Significantly elevated).'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'sputum_gram', category: 'laboratory', name: t('Микроскопия и посев мокроты', 'Қақрық микроскопиясы мен егіндісі', 'Sputum Gram stain & culture'), result: t('Грамположительные диплококки (Streptococcus pneumoniae).', 'Streptococcus pneumoniae диплококктары.', 'Gram-positive lancet-shaped diplococci (Streptococcus pneumoniae).'), cost: 3, delayMs: 3000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Эмпирическая стартовая антибактериальная терапия', 'Эмпирикалық антибактериалды терапия', 'Empiric oral/IV antibacterial therapy'), t('Оценка по шкале CURB-65 / CRB-65 (Балл = 1 — допустимо амбулаторное лечение или дневной стационар)', 'CURB-65 бағалау (1 балл)', 'CURB-65 score = 1 assessment')],
      medications: [t('Амоксициллин/Клавуланат 1000 мг 2 раза/сут перорально (или Цефтриаксон 2 г/сут в/в) + Азитромицин 500 мг/сут 3 дня', 'Амоксициллин/Клавуланат 1000 мг 2 рет/тәул + Азитромицин 500 мг', 'Amoxicillin/Clavulanate 1000 mg BID PO OR Ceftriaxone 2 g IV + Azithromycin 500 mg daily'), t('Амброксол 30 мг 3 раза/сут для отхождения мокроты', 'Амброксол 30 мг 3 рет/тәул', 'Ambroxol 30 mg TID for mucolysis'), t('Парацетамол 500 мг при T > 38.5°C', 'Парацетамол 500 мг', 'Paracetamol 500 mg PRN for fever')],
      nonDrug: [t('Обильное питьё до 2.5-3 л/сут, дыхательная гимнастика после снижения температуры', 'Мол сұйықтық ішу, тыныс алу гимнастикасы', 'Hydration 2.5-3 L/day, chest physiotherapy')],
      disposition: t('Амбулаторное лечение под наблюдением участкового терапевта', 'Амбулаториялық терапевт бақылауы', 'Outpatient GP management'),
      followUp: t('Оценка эффективности антибиотика через 48-72 часа (динамика лихорадки), контрольный рентген через 3-4 недели', '48-72 сағаттан кейін ем тиімділігін бағалау', 'Clinical reassessment at 48-72 hrs; follow-up CXR in 3-4 weeks'),
      redFlags: [t('Нарастание одышки (ЧДД > 30), гипотония (АД < 90/60), SpO2 < 90%, появление плеврального эффузия', 'Ентігудің күшеюі, SpO2 < 90% төмендеуі', 'Respiratory failure (RR > 30, SpO2 < 90%), septic shock, empyema')],
    },
    expectedActions: ['curb65_eval', 'chest_xray', 'amoxicillin_clavulanate_or_ceftriaxone', 'evaluate_response_at_48h'],
    dangerousActions: ['delay_antibiotics_beyond_4_hours', 'prescribe_cough_suppressants_codeine_blocking_sputum'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'asthma': {
    correctDiagnosis: { code: 'J45.0', name: t('Бронхиальная астма, атопическая форма, среднетяжёлое обострение', 'Атопиялық бронх демікпесінің орташа өршуі', 'Asthma exacerbation, moderate atopic'), required: true },
    differentials: [
      { code: 'J45.0', name: t('Обострение бронхиальной астмы', 'Бронх демікпесінің өршуі', 'Asthma exacerbation'), required: true },
      { code: 'J44.1', name: t('Обострение ХОБЛ', 'ӨСӨА өршуі', 'COPD exacerbation') },
      { code: 'T17.5', name: t('Инородное тело дыхательных путей', 'Тыныс жолдарының бөгде денесі', 'Foreign body in respiratory tract') },
      { code: 'T78.2', name: t('Анафилаксия / Отёк Квинке', 'Анафилаксия', 'Anaphylaxis') },
    ],
    examinations: [
      { id: 'wheezing_auscultation', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Ослабленное дыхание, рассеянные сухие свистящие хрипы по всем легочным полям с удлиненным выдохом.', 'Әлсіреген тыныс, барлық өкпе аймағында шашыранды құрғақ ысқырықты сырылдар.', 'Expiratory wheezing throughout both lungs, prolonged expiratory phase.'), relevant: true },
      { id: 'accessory_muscles', category: 'respiratory', label: t('Оценка участия вспомогательной мускулатуры', 'Көмекші бұлшықеттердің қатысуын бағалау', 'Use of accessory respiratory muscles'), result: t('Умеренное втягивание межреберных промежутков при дыхании.', 'Тыныс алғанда қабырғааралық аралықтардың орташа тартылуы.', 'Moderate intercostal retractions during inspiration.'), relevant: true },
      { id: 'peak_flow', category: 'respiratory', label: t('Пикфлоуметрия (ПОСвыд)', 'Пикфлоуметрия', 'Peak Expiratory Flow Rate (PEFR)'), result: t('ПОСвыд: 55% от должного значения (среднетяжёлое ограничение).', 'ПОСвыд: тиісті мәннен 55%.', 'PEFR: 55% of predicted value (moderate airflow limitation).'), relevant: true },
    ],
    investigations: [
      { id: 'spo2_eval', category: 'functional', name: t('Пульсоксиметрия (SpO2)', 'Пульсоксиметрия (SpO2)', 'Pulse oximetry'), result: t('SpO2: 89% на воздухе.', 'SpO2: 89% бөлме ауасында.', 'SpO2: 89% on room air.'), cost: 1, delayMs: 0, indicated: true },
      { id: 'cbc_eosinophils', category: 'laboratory', name: t('Общий анализ крови с эозинофилами', 'Эозинофилдері бар ЖАҚ', 'CBC with Eosinophils'), result: t('Лейкоциты: 8.4 х 10^9/л, Эозинофилы: 8% (Эозинофилия).', 'Лейкоциттер: 8.4 х 10^9/л, Эозинофилдер: 8%.', 'WBC: 8.4 x 10^9/L, Eosinophils: 8% (Eosinophilia).'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'cxr', category: 'imaging', name: t('Рентгенография ОГК', 'Кеуде торы рентгенографиясы', 'Chest X-ray'), result: t('Гиперинфляция легочной ткани (повышенная прозрачность), очаговых теней нет.', 'Өкпе тінінің гиперинфляциясы, ошақты көлеңкелер жоқ.', 'Hyperinflation of lungs, low flat diaphragms, no infiltrate.'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'abg', category: 'laboratory', name: t('Газы артериальной крови', 'Артериялық қан газдары', 'Arterial Blood Gas'), result: t('pH 7.38, PaO2 62 мм рт.ст., PaCO2 42 мм рт.ст. (нормализация PaCO2 при одышке — знак утомления!).', 'pH 7.38, PaO2 62 мм б.б., PaCO2 42 мм б.б.', 'pH 7.38, PaO2 62 mmHg, PaCO2 42 mmHg (pseudonormal PaCO2 indicates fatigue!).'), cost: 3, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Немедленная оксигенотерапия до SpO2 93-95%', 'SpO2 93-95% дейін шұғыл оксигенотерапия', 'Immediate oxygen therapy to target SpO2 93-95%'), t('Ингаляционные КДБА через небулайзер каждые 20 минут в первый час', 'Небулайзер арқылы КДБА ингаляциясы', 'Inhaled SABA via nebulizer every 20 minutes for first hour')],
      medications: [t('Сальбутамол 2.5-5.0 мг + Ипратропия бромид 0.5 мг через небулайзер', 'Сальбутамол 2.5-5.0 мг + Ипратропий бромиді 0.5 мг небулайзер арқылы', 'Salbutamol 2.5-5.0 mg + Ipratropium bromide 0.5 mg via nebulizer'), t('Системные глюкокортикостероиды (Преднизолон 40-50 мг внутрь или в/в)', 'Системалық ГКС (Преднизолон 40-50 мг)', 'Systemic corticosteroids (Prednisolone 40-50 mg orally or IV)')],
      nonDrug: [t('Успокоить пациента, придать сидячее положение с опорой на руки', 'Науқасты тыныштандыру, отыру қалпы', 'Calm patient, seated position leaning forward')],
      disposition: t('Госпитализация при отсутствии ответа на небулайзерную терапию в течение 1-2 ч', '1-2 сағат ішінде небулайзерге жауап болмаса госпитализациялау', 'Admit to respiratory unit if poor response to initial therapy'),
      followUp: t('Обучение правильному использованию дозированных ингаляторов и спейсера', 'Ингалятор мен спейсерді дұрыс пайдалануға үйрету', 'Inhaler technique review and asthma action plan'),
      redFlags: [t('"Немое" легкое (исчезновение хрипов), парадоксальное дыхание, брадикардия, сопор', '«Үнсіз» өкпе, парадоксальды тыныс, брадикардия, сопор', '"Silent chest" (disappearing wheezes), paradoxical breathing, bradycardia, altered consciousness')],
    },
    expectedActions: ['oxygen_therapy', 'nebulized_salbutamol', 'systemic_steroid', 'peak_flow'],
    dangerousActions: ['sedatives_or_tranquilizers', 'delay_steroids', 'non_selective_beta_blocker'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'copd-exacerbation': {
    correctDiagnosis: { code: 'J44.1', name: t('Хроническая обструктивная болезнь лёгких (ХОБЛ), инфекционное обострение', 'ӨСӨА инфекциялық өршуі', 'COPD acute infectious exacerbation'), required: true },
    differentials: [
      { code: 'J44.1', name: t('Обострение ХОБЛ', 'ӨСӨА өршуі', 'COPD exacerbation'), required: true },
      { code: 'J45.9', name: t('Бронхиальная астма', 'Бронх демікпесі', 'Asthma') },
      { code: 'J18.9', name: t('Внебольничная пневмония', 'Қауымдастықтан тыс пневмония', 'Pneumonia') },
      { code: 'I50.0', name: t('Декомпенсация правого желудочка (Легочное сердце)', 'Өкпелік жүрек', 'Cor pulmonale decompensation') },
    ],
    examinations: [
      { id: 'barrel_chest', category: 'respiratory', label: t('Осмотр грудной клетки и форма (Бочкообразная)', 'Кеуде торы пішінін тексеру (Бөшке тәрізді)', 'Barrel chest & respiratory pattern'), result: t('Бочкообразная форма грудной клетки, выдох через согнутые губы ("пыхтелыщик"), участие шеи в дыхании.', 'Бөшке тәрізді кеуде торы, еріндерді созып тыныс алу.', 'Barrel-shaped chest, pursed-lip breathing, use of neck accessory muscles.'), relevant: true },
      { id: 'box_percussion', category: 'respiratory', label: t('Перкуссия и аускультация лёгких', 'Өкпені перкуссиялау және аускультациялау', 'Percussion & auscultation'), result: t('Коробочный перкуторный звук, ослабленное везикулярное дыхание ("ватное легкое"), рассеянные сухие и разнокалиберные влажные хрипы.', 'Қорапты перкуторлы дыбыс, әлсіреген тыныс.', 'Hyperresonant boxy percussion, distant breath sounds, scattered dry wheezes & coarse crackles.'), relevant: true },
      { id: 'sputum_purulence', category: 'respiratory', label: t('Оценка мокроты (Критерии Антонисена)', 'Қақрықты бағалау (Антонисен критерийлері)', 'Sputum character (Anthonisen criteria)'), result: t('Увеличение объема мокроты, нарастание одышки и появление гнойного характера мокроты (3 критерия Антонисена — тип 1).', 'Қақрық көлемі мен гнойный сипатының артуы.', 'Increased dyspnea, increased sputum volume, and increased sputum purulence (Anthonisen Type 1).'), relevant: true },
    ],
    investigations: [
      { id: 'abg_copd', category: 'laboratory', name: t('Газы артериальной крови (PaO2, PaCO2, pH)', 'Артериялық қан газдары', 'Arterial Blood Gas (ABG)'), result: t('PaO2: 56 мм рт.ст., PaCO2: 52 мм рт.ст., pH: 7.34 (Гиперкапническая дыхательная недостаточность).', 'PaO2: 56 мм б.б., PaCO2: 52 мм б.б., pH: 7.34.', 'PaO2: 56 mmHg, PaCO2: 52 mmHg, pH 7.34 (Hypercapnic respiratory failure).'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'cxr_copd', category: 'imaging', name: t('Рентгенография ОГК', 'Кеуде торы рентгенографиясы', 'Chest X-ray'), result: t('Эмфизема, низкое стояние куполов диафрагмы, расширение реберных промежутков, очаговых инфильтратов нет.', 'Эмфизема, диафрагманың төмен тұруы.', 'Hyperinflation, flattened diaphragms, enlarged retrosternal space, no consolidation.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_copd', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Эритроциты: 5.6 х 10^12/л, Гемоглобин: 168 г/л (Вторичный эритроцитоз), Лейкоциты: 11.2 х 10^9/л.', 'Эритроцитоз (Гемоглобин 168 г/л), Лейкоцитоз 11.2 х 10^9/л.', 'RBC: 5.6 x 10^12/L, Hb: 168 g/L (Secondary polycythemia), WBC: 11.2 x 10^9/L.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'spirometry_post', category: 'functional', name: t('Спирометрия с бронходилатационной пробой (После стабильности)', 'Спирометрия', 'Spirometry with bronchodilator test'), result: t('ОФВ1/ФЖЕЛ < 0.70, ОФВ1: 42% от должного (Тяжелая неполностью обратимая обструкция).', 'ОФВ1/ФЖЕЛ < 0.70.', 'Post-bronchodilator FEV1/FVC < 0.70, FEV1 42% predicted (GOLD 3 severe airflow limitation).'), cost: 4, delayMs: 3000, indicated: false },
    ],
    managementPlan: {
      recommendations: [t('Контролируемая оксигенотерапия (SpO2 целевое 88-92%!) через вентилируемую маску Вентури', 'Бақыланатын оксигенотерапия (SpO2 88-92%!)', 'Controlled target oxygen therapy (SpO2 88-92% ONLY to prevent CO2 narcosis!)'), t('Усиление бронходилатационной терапии + системные ГКС + антибиотики', 'Бронходилататорлар + ГКС + антибиотиктер', 'Escalate bronchodilators + systemic steroids + antibiotics')],
      medications: [t('Ипратропий/Фенотеророл (Беродуал) 20-40 капель через небулайзер каждые 4-6 часов', 'Беродуал небулайзер арқылы', 'Inhaled Ipratropium/Fenoterol or Salbutamol via nebulizer Q4-6H'), t('Преднизолон 40 мг/сут перорально 5 дней', 'Преднизолон 40 мг/тәул 5 күн', 'Oral Prednisolone 40 mg daily for 5 days'), t('Амоксициллин/Клавуланат 1000 мг 2 раза/сут или Азитромицин 500 мг/сут 5 дней при гнойной мокроте', 'Антибиотик гнойный қақрықта 5 күн', 'Amoxicillin/Clavulanate 1000 mg PO BID or Macrolide for 5 days')],
      nonDrug: [t('НИВЛ (Неинвазивная вентиляция легких CPAP/BiPAP) при нарастании гиперкапнии и pH < 7.35', 'pH < 7.35 болғанда НИВЛ (BiPAP)', 'NIV (BiPAP) for acute hypercapnic respiratory failure (pH < 7.35)')],
      disposition: t('Госпитализация в пульмонологическое отделение / ОРИТ при гиперкапнии', 'Пульмонология немесе ОРИТ', 'Admit to Respiratory Ward or Respiratory ICU'),
      followUp: t('Обучение технике ингаляций, вакцинация от пневмококка и гриппа', 'Ингаляция техникасын үйрету, вакцинация', 'Inhaler technique review, pneumococcal & flu vaccination'),
      redFlags: [t('Угнетение сознания гиперкапнией (гиперкапнический сопор/кома), декомпенсированный ацидоз pH < 7.25', 'Гиперкапниялық сопор, pH < 7.25', 'Hypercapnic coma/encephalopathy, severe acidosis requiring intubation')],
    },
    expectedActions: ['target_oxygen_88_92_percent', 'nebulized_dual_bronchodilators', 'systemic_steroid_5days', 'empiric_antibiotic_for_purulent_sputum'],
    dangerousActions: ['high_flow_100_percent_oxygen_suppresses_hypoxic_respiratory_drive', 'long_term_steroids_beyond_5_7_days'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'pe': {
    correctDiagnosis: { code: 'I26.9', name: t('Тромбоэмболия легочной артерии (ТЭЛА) высокого/промежуточного риска', 'Өкпе артериясының тромбоэмболиясы (ӨАТЭ)', 'Pulmonary embolism (PE), intermediate-high risk'), required: true },
    differentials: [
      { code: 'I26.9', name: t('Тромбоэмболия легочной артерии', 'Өкпе артериясының тромбоэмболиясы', 'Pulmonary embolism'), required: true },
      { code: 'I21.9', name: t('Острый инфаркт миокарда', 'Миокард инфарктісі', 'Myocardial infarction') },
      { code: 'I30.9', name: t('Острый перикардит', 'Перикардит', 'Pericarditis') },
      { code: 'J93.9', name: t('Спонтанный пневмоторакс', 'Спонтанды пневмоторакс', 'Spontaneous pneumothorax') },
    ],
    examinations: [
      { id: 'wells_geneva_score', category: 'general', label: t('Оценка по клиническим шкалам Wells и Geneva', 'Wells және Geneva шкалалары бойынша бағалау', 'Wells & Geneva Clinical Probability Scores'), result: t('Wells score = 6.0 баллов (Высокий риск ТЭЛА): ТГВ в анамнезе/признаки (+3), ЧСС > 100 (+1.5), одышка без альтернативы (+1.5).', 'Wells score = 6.0 балл (ӨАТЭ жоғары қаупі).', 'Wells score = 6.0 (High probability for PE): signs of DVT (+3), HR > 100 (+1.5), alternative diagnosis less likely (+1.5).'), relevant: true },
      { id: 'tachycardia_hypotension', category: 'cardiovascular', label: t('Оценка гемодинамики и II тона над ЛА', 'Гемодинамиканы және өкпе артериясында II тонды бағалау', 'Vitals & cardiac second sound (P2)'), result: t('Выраженная тахикардия 118 в мин, АД 100/65 мм рт.ст., акцент II тона над легочной артерией, набухание шейных вен.', 'Тахикардия 118 мин, АД 100/65 мм б.б., II тон акценті.', 'Sinus tachycardia 118 bpm, BP 100/65 mmHg, loud P2, neck vein distension.'), relevant: true },
      { id: 'leg_inspection_pe', category: 'cardiovascular', label: t('Осмотр нижних конечностей (Признаки ТГВ)', 'Аяқтарды тексеру (ТҒТ белгілері)', 'Lower limb DVT inspection'), result: t('Отек и болезненность правой голени (+3.5 см окружность).', 'Оң балтырдың ісінуі (+3.5 см).', 'Asymmetric right calf swelling (+3.5 cm) & tenderness.'), relevant: true },
    ],
    investigations: [
      { id: 'ctpa_gold', category: 'imaging', name: t('КТ-ангиография легочных артерий (КТА ЛА — Золотой стандарт!)', 'Өкпе артерияларының КТ-ангиографиясы', 'CT Pulmonary Angiography (CTPA)'), result: t('Дефекты наполнения (тромбоэмболы) в главном стволе и правой легочной артерии с признаками перегрузки правого желудочка.', 'Оң өкпе артериясы діңінде тромбоэмболдар.', 'Occlusive saddle/lobar emboli in main right pulmonary artery branches with RV strain.'), cost: 8, delayMs: 2000, indicated: true },
      { id: 'd_dimer_pe', category: 'laboratory', name: t('D-димер крови', 'Қан D-димері', 'D-dimer quantitative assay'), result: t('D-димер: 4200 нг/мл (Резко повышен > 500 нг/мл).', 'D-димер: 4200 нг/мл (Шұғыл жоғары).', 'D-dimer: 4200 ng/mL (Markedly elevated).'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'echo_rv_strain', category: 'functional', name: t('ЭхоКГ (Признаки перегрузки ПЖ)', 'ЭхоКГ (Оң қарынша перегрузкасы)', 'Echocardiography (RV strain)'), result: t('Дилатация правого желудочка (ПЖ/ЛЖ > 1.0), признак МакКоннелла (гипокинезия боковой стенки ПЖ при нормальной верхушке), СДЛА 52 мм рт.ст.', 'Оң қарынша дилатациясы (ПЖ/ЛЖ > 1.0), МакКоннелл белгісі.', 'RV dilation (RV/LV ratio > 1.0), McConnell sign, PASP 52 mmHg.'), cost: 5, delayMs: 1500, indicated: true },
      { id: 'ecg_s1q3t3', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Синусовая тахикардия 118 в мин, признак S1-Q3-T3 (синдром МакДжина-Уайта), инверсия T в V1-V4.', 'Тахикардия 118 мин, S1-Q3-T3 синдромы.', 'Sinus tachycardia 118 bpm, McGinn-White S1Q3T3 pattern, T-wave inversions V1-V4.'), cost: 2, delayMs: 0, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Немедленная антикоагулянтная терапия до и во время визуализации!', 'Визуализацияға дейін шұғыл антикоагулянттық терапия!', 'Immediate therapeutic anticoagulation prior to CTPA if high suspicion!'), t('Тромболитическая терапия (ТЛТ) при ТЭЛА высокого риска с обмороком / шоком', 'Шок кезінде Тромболитикалық терапия (ТЛТ)', 'Systemic Thrombolysis (Alteplase) ONLY if hemodynamically unstable/shock')],
      medications: [t('НМГ (Эноксапарин 1 мг/кг с/к 2 раза/сут) или Нефракционированный гепарин (НФГ) в/в болюс + инфузия под контролем АЧТВ', 'Эноксапарин 1 мг/кг 2 рет/тәул т/а немесе Гепарин т/і', 'Enoxaparin 1 mg/kg SC BID OR IV UFH bolus + infusion adjusted to aPTT'), t('ПОАК (Ривароксабан 15 мг 2 раза/сут или Апиксабан 10 мг 2 раза/сут) при стабильном состоянии', 'Ривароксабан 15 мг 2 рет/тәул', 'Rivaroxaban 15 mg BID PO for 3 weeks OR Apixaban 10 mg BID PO for 7 days')],
      nonDrug: [t('Оксигенотерапия для поддержания SpO2 > 92%, строгий постельный режим', 'SpO2 > 92% оксигенотерапия, төсек режимі', 'Supplemental oxygen to maintain SpO2 > 92%, strict bed rest')],
      disposition: t('Госпитализация в отделение реанимации и интенсивной терапии (ОРИТ)', 'ОРИТ-ке госпитализациялау', 'ICU or Cardiac Care Unit Admission'),
      followUp: t('Длительность антикоагулянтов минимум 3-6 месяцев (или пожизненно при неспровоцированной ТЭЛА)', 'Кемінде 3-6 ай антикоагулянттар қабылдау', 'Anticoagulation for minimum 3-6 months (lifelong if unprovoked)'),
      redFlags: [t('Острая правожелудочковая недостаточность, кардиогенный шок, остановка кровообращения', 'Оң қарыншалық жетіспеушілік, шок', 'Obstructive shock, PEA cardiac arrest, acute RV failure')],
    },
    expectedActions: ['wells_score_eval', 'ctpa_order', 'therapeutic_anticoagulation_enoxaparin', 'echo_rv_strain_check'],
    dangerousActions: ['delay_anticoagulation_in_high_risk_patient', 'prescribe_thrombolysis_in_stable_low_risk_pe'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // GASTROENTEROLOGY
  'appendicitis': {
    correctDiagnosis: { code: 'K35.8', name: t('Острый флегмонозный аппендицит', 'Жедел флегмонозды аппендицит', 'Acute phlegmonous appendicitis'), required: true },
    differentials: [
      { code: 'K35.8', name: t('Острый аппендицит', 'Жедел аппендицит', 'Acute appendicitis'), required: true },
      { code: 'N20.1', name: t('Почечная колика справа', 'Оң бүйрек коликасы', 'Right renal colic') },
      { code: 'K63.3', name: t('Меккелев дивертикулит', 'Меккель дивертикулиті', 'Meckel diverticulitis') },
      { code: 'N83.2', name: t('Апоплексия правого яичника / апоплексия', 'Оң аналық без апоплексиясы', 'Ovarian apoplexy / ectopic pregnancy') },
    ],
    examinations: [
      { id: 'mcburney_shchetkin', category: 'abdominal', label: t('Пальпация живота и симптомы раздражения брюшины', 'Ішті пальпациялау және іш пердесінің тітіркену белгілері', 'Palpation & peritoneal irritation signs'), result: t('Локальная болезненность и защитное напряжение мышц в правой подвздошной области (точка МакБурнея). Положительные симптомы Щёткина-Блюмберга, Ровзинга, Ситковского, Образцова.', 'Оң жақ шап аймағында ауырсыну (МакБурней нүктесі). Щёткин-Блюмберг, Ровзинг, Ситковский белгілері оң.', 'Local tenderness & muscle guarding in right iliac fossa (McBurney point). Positive Shchetkin-Blumberg, Rovsing, Sitkovsky, and Psoas signs.'), relevant: true },
      { id: 'alvarado_score', category: 'general', label: t('Подсчёт балла по шкале Alvarado', 'Alvarado шкаласы бойынша балл санау', 'Alvarado Clinical Score'), result: t('Alvarado score = 8 баллов (Высокая вероятность аппендицита): миграция боли (+1), анорексия (+1), тошнота (+1), болезненность справа (+2), Щёткин (+1), лихорадка (+1), лейкоцитоз (+1).', 'Alvarado score = 8 балл (Жоғары ықтималдылық).', 'Alvarado score = 8 (High probability): pain migration (+1), anorexia (+1), RIF tenderness (+2), rebound (+1), fever (+1), leukocytosis (+1), shift (+1).'), relevant: true },
      { id: 'vitals_abdo', category: 'cardiovascular', label: t('Температура тела и ЧСС', 'Дене температурасы мен ЖҮС', 'Vitals'), result: t('Субфебрильная лихорадка 37.8°C, ЧСС 92 в мин.', 'Дене температурасы 37.8°C, ЖҮС 92 мин.', 'Subfebrile 37.8°C, HR 92 bpm.'), relevant: true },
    ],
    investigations: [
      { id: 'cbc_appendicitis', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоцитоз: 14.8 х 10^9/л, Палочкоядерный сдвиг: 10%, СОЭ: 22 мм/ч.', 'Лейкоцитоз: 14.8 х 10^9/л, таяқшалар 10%.', 'WBC: 14.8 x 10^9/L with left shift (bands 10%), ESR 22 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'us_appendix', category: 'imaging', name: t('УЗИ органов брюшной полости и малого таза', 'Іш қуысы ағзаларының УЗИ-і', 'Abdominal & pelvic ultrasound'), result: t('Червеобразный отросток лоцируется в правой подвздошной области, не сжимаем при компрессии датчиком, диаметр 9 мм (Норма < 6 мм), стенка утолщена до 3 мм, слоистость стерта, скопление свободной жидкости вокруг.', 'Құрт тәрізді өсінді диаметрі 9 мм (утолщен), сығылмайды, сұйықтық бар.', 'Non-compressible appendix in RIF, diameter 9 mm (enlarged > 6 mm), wall thickness 3 mm, periappendiceal fluid.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'urinalysis_app', category: 'laboratory', name: t('Общий анализ мочи (Исключить урологию)', 'Жалпы зәр анализі', 'Urinalysis'), result: t('Норма (Лейкоциты 1-2 в п/з, эритроцитов нет).', 'Норма.', 'Normal urinalysis (excludes renal colic / UTI).'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'crp_app', category: 'laboratory', name: t('С-реактивный белок (СРБ)', 'С-реактивті ақуыз', 'CRP'), result: t('СРБ: 48 мг/л (Повышен).', 'СРБ: 48 мг/л.', 'CRP: 48 mg/L.'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Консультация хирурга! Показано экстренное хирургическое лечение (Аппендэктомия)', 'Хирург консультациясы! Шұғыл аппендэктомия көрсетілген', 'Urgent surgical consultation & Laparoscopic/Open Appendectomy'), t('Предоперационная подготовка и периоперационная антибиотикопрофилактика', 'Ота алдындағы дайындық', 'Preoperative fluids & prophylactic IV antibiotics')],
      medications: [t('Цефтриаксон 2 г в/в + Метронидазол 500 мг в/в однократно за 30-60 мин до разреза', 'Цефтриаксон 2 г т/і + Метронидазол 500 мг т/і ота алдында', 'Single preop dose: Ceftriaxone 2 g IV + Metronidazole 500 mg IV'), t('Спазмолитики / НПВП ПОСЛЕ осмотра хирурга', 'Хирург тексергеннен кейін ауырсынуды басу', 'Analgesics strictly AFTER surgeon examination')],
      nonDrug: [t('Голод (NPO), холод на правую подвздошную область, запрет грелок и клизм!', 'Аш болу (NPO), ішке жылытқыш баспау!', 'Strict NPO (nothing by mouth), local ice pack, NO hot compresses or enemas!')],
      disposition: t('Хирургическое отделение стационара', 'Хирургия бөлімшесі', 'Surgical Ward Admission'),
      followUp: t('Послеоперационное наблюдение 2-3 дня, гистологическое исследование удаленного отростка', 'Операциядан кейінгі бақылау, гистология', 'Postop care 2-3 days, routine appendix histopathology'),
      redFlags: [t('Перфорация отростка, разлитой гнойный перитонит (доскообразный живот, выраженная интоксикация), пелефлебит', 'Өсіндінің жарылуы, перитонит!', 'Appendiceal perforation, diffuse peritonitis, appendiceal mass/abscess')],
    },
    expectedActions: ['alvarado_score_eval', 'abdominal_palpation_mcburney', 'abdominal_ultrasound', 'urgent_surgical_consult_appendectomy'],
    dangerousActions: ['apply_heat_pad_to_abdomen_causes_perforation', 'prescribe_analgesics_before_surgeon_exam_masks_symptoms', 'discharge_home'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'gerd': {
    correctDiagnosis: { code: 'K21.0', name: t('Гастроэзофагеальная рефлюксная болезнь (ГЭРБ) с эрозивным эзофагитом (Степень А по Лос-Анджелес)', 'Гастроэзофагеальды рефлюксті ауру (ГЭРА)', 'Gastroesophageal reflux disease (GERD) with erosive esophagitis'), required: true },
    differentials: [
      { code: 'K21.0', name: t('ГЭРБ / Эзофагит', 'ГЭРА / Эзофагит', 'GERD / Esophagitis'), required: true },
      { code: 'I20.0', name: t('Ишемическая болезнь сердца (Стенокардия)', 'Жүректің ишемиялық ауруы', 'Ischemic heart disease / Angina') },
      { code: 'K25.9', name: t('Язвенная болезнь желудка / ДПК', 'Асқазан жарасы', 'Peptic ulcer disease') },
      { code: 'K22.0', name: t('Ахалазия кардии', 'Кардия ахалазиясы', 'Achalasia') },
    ],
    examinations: [
      { id: 'epigastric_palpation', category: 'abdominal', label: t('Пальпация эпигастральной области', 'Эпигастрий аймағын пальпациялау', 'Epigastric palpation'), result: t('Умеренная болезненность в эпигастрии и проекции мечевидного отростка. Симптомов раздражения брюшины нет.', 'Эпигастрийде орташа ауырсыну.', 'Mild tenderness in epigastrium and retroxiphoid area. No peritoneal signs.'), relevant: true },
      { id: 'heart_ausc_gerd', category: 'cardiovascular', label: t('Аускультация сердца (Исключить ИБС)', 'Жүректі аускультациялау', 'Cardiac auscultation'), result: t('Тоны сердца ритмичные, чистые, 72 в мин. АД 125/80 мм рт.ст.', 'ЖҮС 72 мин, АД 125/80 мм б.б.', 'S1/S2 regular, no murmur, HR 72 bpm, BP 125/80 mmHg.'), relevant: true },
      { id: 'pharynx_gerd', category: 'respiratory', label: t('Осмотр зева и ротоглотки', 'Жұтқыншақты тексеру', 'Pharynx inspection'), result: t('Гиперемия задней стенки глотки (рефлюкс-ларингит), эрозии эмали зубов.', 'Жұтқыншақтың артқы қабырғасының гиперемиясы.', 'Posterior pharyngeal erythema (reflux laryngitis), dental enamel erosion.'), relevant: true },
    ],
    investigations: [
      { id: 'egds', category: 'imaging', name: t('Эзофагогастродуоденоскопия (ЭГДС — Золотой стандарт!)', 'Эзофагогастродуоденоскопия (ЭГДС)', 'Esophagogastroduodenoscopy (EGD)'), result: t('Гиперемия и отечность слизистой нижней трети пищевода, единичные дефекты (эрозии) < 5 мм, не сливающиеся (Лос-Анджелес степень А). Недостаточность розетки кардии.', 'Өңештің төменгі үштен бірінде эрозиялар (< 5 мм), кардия жетіспеушілігі.', 'Mucosal erythema & single mucosal break < 5 mm in distal esophagus (Los Angeles Grade A). Incompetent cardia.'), cost: 6, delayMs: 2500, indicated: true },
      { id: 'ecg_gerd', category: 'functional', name: t('ЭКГ в 12 отведениях (Критическое исключение ишемии!)', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Синусовый ритм 72 в мин. Острых ишемических изменений не выявлено.', 'Синусты ритм 72 мин. Ишемия жоқ.', 'Normal sinus rhythm 72 bpm, no ST-T segment ischemic changes.'), cost: 2, delayMs: 0, indicated: true },
      { id: 'h_pylori_test', category: 'laboratory', name: t('Дыхательный уреазный тест на H. pylori', 'H. pylori-ге тыныс алу тесті', 'Urease breath test for H. pylori'), result: t('Тест отрицательный.', 'Тест теріс.', 'H. pylori breath test negative.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'cbc_gerd', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Гемоглобин: 140 г/л, Эритроциты: 4.6 х 10^12/л (Анемии нет).', 'Гемоглобин: 140 г/л.', 'Hb: 140 g/L (Rules out occult GI bleeding/anemia).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Основная ингибиторная терапия ИПП в течение 4-8 недель', '4-8 апта бойы ИПП негізгі терапиясы', 'Proton Pump Inhibitor (PPI) therapy for 4-8 weeks'), t('Модификация образа жизни и диетотерапия', 'Өмір салты мен диетаны өзгерту', 'Lifestyle & dietary modifications')],
      medications: [t('Омепразол 20 мг 2 раза/сут или Рабепразол / Эзомепразол 20 мг/сут за 30 мин до еды', 'Рабепразол немесе Эзомепразол 20 мг/тәул тамақтан 30 мин бұрын', 'Esomeprazole 20 mg OR Rabeprazole 20 mg daily 30 min before breakfast'), t('Альгинаты / Антациды (Гевискон 10-20 мл) через 45 мин после еды и на ночь', 'Гевискон 10-20 мл тамақтан кейін', 'Alginate (Gaviscon 10-20 mL) after meals and at bedtime')],
      nonDrug: [t('Сон с приподнятым головным концом кровати на 15 см, не лежать 2-3 часа после еды, снизить вес, исключить жирное, шоколад, кофе, алкоголь, курение', 'Төсектің бас жағын 15 см көтеру, тамақтан кейін жатпау', 'Elevate head of bed 15 cm, avoid recumbency within 2-3h post-meal, limit fat/coffee/alcohol')],
      disposition: t('Амбулаторное наблюдение гастроэнтеролога / терапевта', 'Гастроэнтерологта амбулаториялық бақылау', 'Outpatient GI care'),
      followUp: t('Оценка симптомов через 4-8 недель; повторная ЭГДС при сохранении дисфагии или кровотечении', '4-8 аптадан кейін симптомдарды бағалау', 'Clinical review in 4-8 weeks; repeat EGD if alarm features persist'),
      redFlags: [t('Симптомы "красных флагов": прогрессирующая дисфагия (застревание пищи), одинофагия, рвота "кофейной гущей", мелена, снижение веса (исключить рак пищевода!)', 'Дисфагия, салмақ тастау, «кофейная гуща» құсу!', 'Alarm features: progressive dysphagia, odynophagia, unexplained weight loss, GI bleed')],
    },
    expectedActions: ['ecg_rule_out_angina', 'egds_esophagoscopy', 'ppi_therapy_start', 'lifestyle_elevation_advice'],
    dangerousActions: ['prescribe_nsaids_worsens_erosions', 'ignore_cardiac_workup_in_epigastric_chest_pain'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'cholecystitis': {
    correctDiagnosis: { code: 'K81.0', name: t('Острый калькулезный холецистит средней степени тяжести', 'Жедел калькулезді холецистит', 'Acute calculous cholecystitis'), required: true },
    differentials: [
      { code: 'K81.0', name: t('Острый холецистит', 'Жедел холецистит', 'Acute cholecystitis'), required: true },
      { code: 'K85.9', name: t('Острый панкреатит', 'Жедел панкреатит', 'Acute pancreatitis') },
      { code: 'K25.9', name: t('Перфоративная язва желудка', 'Асқазанның тесілген жарасы', 'Perforated peptic ulcer') },
      { code: 'K80.2', name: t('Желчная колика', 'Өт коликасы', 'Biliary colic') },
    ],
    examinations: [
      { id: 'murphy_ortner', category: 'abdominal', label: t('Пальпация и специфические симптомы (Мёрфи, Ортнера)', 'Мёрфи және Ортнер белгілері', 'Murphy & Ortner signs'), result: t('Резкая болезненность при пальпации в правом подреберье с задержкой вдоха (Симптом Мёрфи +). Положительные симптомы Ортнера (поколачивание по реберной дуге), Ортнера-Грекова, Георгиевского-Мусси (френикус-симптом).', 'Оң жақ қабырға астында ауырсыну, Мёрфи, Ортнер, Френикус белгілері оң.', 'Positive Murphy sign (inspiratory arrest on RUA palpation), positive Ortner sign (right costal percussion tenderness), positive phrenic sign.'), relevant: true },
      { id: 'peritoneal_cholecyst', category: 'abdominal', label: t('Оценка локального дефанса', 'Локальды дефансты бағалау', 'Local peritoneal reaction'), result: t('Локальное защитное напряжение мышц брюшной стенки в правом подреберье. Слабоположительный симптом Щёткина-Блюмберга там же.', 'Оң жақ қабырға астында бұлшықеттердің жергілікті кернеуі.', 'Local muscle guarding in right upper quadrant. Mild local rebound tenderness.'), relevant: true },
      { id: 'temp_cholecyst', category: 'general', label: t('Температура тела', 'Дене температурасы', 'Body temperature'), result: t('Фебрильная лихорадка 38.4°C.', 'Дене температурасы 38.4°C.', 'Fever 38.4°C.'), relevant: true },
    ],
    investigations: [
      { id: 'us_gallbladder', category: 'imaging', name: t('УЗИ органов брюшной полости (Золотой стандарт!)', 'Іш қуысы ағзаларының УЗИ-і', 'Abdominal Ultrasound (Gold standard)'), result: t('Желчный пузырь увеличен (98х42 мм), стенка утолщена до 5.5 мм (Норма < 3 мм) с признаками слоистости и двойного контура ("двойной ободок"), в шейке вклинен конкремент 16 мм, перихолецистическая жидкость.', 'Өт қабы үлкейген, қабырғасы 5.5 мм қалыңдаған, 16 мм конкремент вклинен.', 'Enlarged gallbladder (98x42 mm), wall thickening 5.5 mm with double-contour pericholecystic fluid, 16 mm calculus impacted in neck.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_cholecyst', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоцитоз 15.2 х 10^9/л с сдвигом влево (палочки 11%), СОЭ 34 мм/ч.', 'Лейкоцитоз 15.2 х 10^9/л, таяқшалар 11%.', 'WBC: 15.2 x 10^9/L with left shift (bands 11%), ESR 34 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'lft_bilirubin', category: 'laboratory', name: t('Биохимический анализ крови (Билирубин, АЛТ, АСТ, ЩФ, Амилаза)', 'Билирубин, АЛТ, АСТ, ЩФ', 'Liver Function Tests & Amylase'), result: t('Общий билирубин: 28 мкмоль/л (Прямой 12 мкмоль/л), ЩФ: 140 ЕД/л, АЛТ: 42 ЕД/л, Амилаза: 45 ЕД/л (Норма).', 'Жалпы билирубин: 28 мкмоль/л, ЩФ: 140 ЕД/л.', 'Total Bilirubin: 28 umol/L, Alk Phos: 140 U/L, ALT: 42 U/L, Serum Amylase: 45 U/L (Normal).'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'crp_cholecyst', category: 'laboratory', name: t('С-реактивный белок (СРБ)', 'С-реактивті ақуыз', 'CRP'), result: t('СРБ: 86 мг/л (Повышен).', 'СРБ: 86 мг/л.', 'CRP: 86 mg/L.'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Консультация хирурга! Показана ранняя лапароскопическая холецистэктомия (в первые 24-72 ч)', 'Хирург консультациясы! Ерте лапароскопиялық холецистэктомия көрсетілген', 'Early laparoscopic cholecystectomy within 24-72 hours of admission'), t('Консервативная инфузионная и спазмолитическая терапия', 'Консервативті инфузиялық терапия', 'IV resuscitation, spasmolytics, analgesia')],
      medications: [t('Цефтриаксон 2 г в/в 1 раз/сут + Метронидазол 500 мг 3 раза/сут в/в капельно', 'Цефтриаксон 2 г т/і + Метронидазол 500 мг т/і', 'Ceftriaxone 2 g IV daily + Metronidazole 500 mg IV TID'), t('Дротаверин (Но-шпа) 40 мг в/в или Кеторолак 30 мг в/в при боли', 'Дротаверин 40 мг т/і немесе Кеторолак 30 мг т/і', 'Drotaverine 40 mg IV OR Ketorolac 30 mg IV PRN')],
      nonDrug: [t('Голод (NPO), дезинтоксикационная инфузионная терапия (0.9% NaCl, Рингер)', 'Аш болу (NPO), инфузиялық терапия', 'NPO status, IV fluid rehydration')],
      disposition: t('Госпитализация в хирургическое отделение', 'Хирургия бөлімшесіне госпитализациялау', 'General Surgery Ward Admission'),
      followUp: t('Послеоперационный уход, ультразвуковой контроль дренажа', 'Операциядан кейінгі күтім', 'Postop surgical wound & ultrasound check'),
      redFlags: [t('Эмпиема желчного пузыря, гангрена, перфорация, разлитой желчный перитонит, холангит (триада Шарко)', 'Эмпиема, гангрена, желчный перитонит, холангит (Шарко триадасы)!', 'Gallbladder empyema/gangrene, perforation, biliary peritonitis, ascending cholangitis')],
    },
    expectedActions: ['murphy_sign_exam', 'abdominal_ultrasound', 'early_surgical_consult_cholecystectomy', 'iv_antibiotics_ceftriaxone_metronidazole'],
    dangerousActions: ['choleretic_cholecystokinetic_drugs_increases_perforation_risk', 'discharge_home_without_surgeons_eval'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'pancreatitis': {
    correctDiagnosis: { code: 'K85.9', name: t('Острый отечный панкреатит средней степени тяжести', 'Жедел ісінулі панкреатит', 'Acute edematous pancreatitis'), required: true },
    differentials: [
      { code: 'K85.9', name: t('Острый панкреатит', 'Жедел панкреатит', 'Acute pancreatitis'), required: true },
      { code: 'K25.9', name: t('Перфоративная язва желудка', 'Асқазанның тесілген жарасы', 'Perforated peptic ulcer') },
      { code: 'K56.6', name: t('Острая кишечная непроходимость', 'Жедел ішек өткелсіздігі', 'Acute intestinal obstruction') },
      { code: 'I21.9', name: t('Острый инфаркт миокарда (абдоминальная форма)', 'Миокард инфарктісі', 'Myocardial infarction (abdominal form)') },
    ],
    examinations: [
      { id: 'girdle_pain_palpation', category: 'abdominal', label: t('Пальпация эпигастрия и специфические симптомы (Мейо-Робсона, Воскресенского)', 'Мейо-Робсон және Воскресенский белгілері', 'Mayo-Robson & Voskresensky signs'), result: t('Опоясывающая выраженная боль в эпигастрии и мезогастрии. Исчезновение пульсации брюшной аорты в эпигастрии (Симптом Воскресенского +). Болезненность в левом реберно-позвоночном угле (Симптом Мейо-Робсона +).', 'Эпигастрийде белдемелі ауырсыну. Воскресенский және Мейо-Робсон белгілері оң.', 'Severe epigastric pain radiating to back (girdle pain). Absence of aortic pulsation (Voskresensky sign) & left costovertebral angle tenderness (Mayo-Robson sign).'), relevant: true },
      { id: 'bloating_nausea', category: 'abdominal', label: t('Оценка пареза кишечника и рвоты', 'Ішек парезін және құсуды бағалау', 'Paresis & vomiting assessment'), result: t('Метеоризм, парез кишечника (ослабление кишечных шумов). Неприносящая облегчения повторная рвота.', 'Метеоризм, жеңілдік әкелмейтін кайталама құсу.', 'Abdominal distension, reduced bowel sounds (ileus), persistent non-bilious vomiting.'), relevant: true },
      { id: 'vitals_pancreas', category: 'cardiovascular', label: t('Измерение АД, ЧСС и температуры', 'АД, ЖҮС, температура өлшеу', 'Vital signs'), result: t('ЧСС: 108 в мин (Тахикардия), АД: 105/65 мм рт.ст., Температура 37.9°C.', 'ЖҮС 108 мин, АД 105/65 мм б.б.', 'HR 108 bpm (tachycardia), BP 105/65 mmHg, Temp 37.9°C.'), relevant: true },
    ],
    investigations: [
      { id: 'lipase_amylase', category: 'laboratory', name: t('Липаза и Амилаза сыворотки (Критическая диагностика!)', 'Сарысулық липаза мен амилаза', 'Serum Lipase & Amylase (Critical!)'), result: t('Липаза сыворотки: 840 ЕД/л (Норма < 60 ЕД/л) — превышает норму в 14 раз!, Амилаза крови: 420 ЕД/л (Норма < 100).', 'Сарысулық липаза 840 ЕД/л (14 есе жоғары!), Амилаза 420 ЕД/л.', 'Serum Lipase: 840 U/L (Normal < 60, >3x upper limit confirms pancreatitis!), Serum Amylase: 420 U/L.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'us_pancreas', category: 'imaging', name: t('УЗИ органов брюшной полости', 'Іш қуысы ағзаларының УЗИ-і', 'Abdominal Ultrasound'), result: t('Поджелудочная железа диффузно увеличена в размерах (головка 35 мм, тело 24 мм), контуры нечеткие, эхогенность снижена, парапанкреатический отек.', 'Уйқы безі диффузды үлкейген, контурлары анық емес.', 'Diffusely enlarged pancreas (head 35 mm), blurry margins, hypoechoic parenchyma, peripancreatic fluid collection.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_pancreas', category: 'laboratory', name: t('Общий анализ крови и гематокрит', 'Жалпы қан анализі және гематокрит', 'CBC & Hematocrit'), result: t('Лейкоцитоз 14.2 х 10^9/л, Гематокрит 46% (Гемоконцентрация из-за выпота).', 'Лейкоцитоз 14.2 х 10^9/л, Гематокрит 46%.', 'WBC: 14.2 x 10^9/L, Hematocrit 46% (Hemoconcentration due to third-spacing).'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'ct_contrast_pancreas', category: 'imaging', name: t('КТ ОБП с контрастированием (При отсутствии ответа через 72 ч)', 'Контрастты КТ', 'Contrast-enhanced Abdominal CT'), result: t('Отечная форма панкреатита. Зон некроза паренхимы не выявлено (Индекс Бальтазар B).', 'Өтекті панкреатит. Некроз ошақтары жоқ.', 'Diffusely swollen pancreas, acute peripancreatic fluid, no parenchymal necrosis (Balthazar B).'), cost: 8, delayMs: 3000, indicated: false },
    ],
    managementPlan: {
      recommendations: [t('Агрессивная внутривенная гидратация кристаллоидами (Раствор Рингера 200-500 мл/час в первые 12-24 ч!)', 'Алғашқы 12-24 сағатта Рингер ерітіндісімен агрессивті гидратация!', 'Aggressive IV fluid resuscitation (Ringer lactate 200-500 mL/hr in first 12-24h!)'), t('Адекватное обезболивание', 'Адекватты ауырсынуды басу', 'Adequate multi-modal analgesia')],
      medications: [t('Адекватное обезболивание (Кеторолак в/в или Промедол/Фентанил при сильной боли)', 'Адекватты ауырсынуды басу', 'Adequate analgesia (Ketorolac IV or opioids for severe pain)'), t('Ингибиторы протонной помпы (Омепразол 40 мг в/в 2 раза/сут)', 'ИПП (Омепразол 40 мг т/і)', 'IV PPI (Omeprazole 40 mg IV BID)')],
      nonDrug: [t('Покой, голод в ранние сроки при рвоте, с ранним пероральным/энтеральным питанием при переносимости', 'Ерте мерзімде аш болу, кейін пероралы тамақтану', 'Initial oral rest if vomiting, early enteral nutrition as tolerated')],
      disposition: t('Стационарное лечение в хирургической реанимации', 'Хирургиялық реанимацияда стационарлық емдеу', 'Surgical ICU admission'),
      followUp: t('Контроль амилазы, липазы, CРБ и кальция крови каждые 24-48 часов', '24-48 сағат сайын амилаза, липаза, СРБ бақылау', 'Monitor lipase, CRP, hematocrit, calcium every 24-48 hours'),
      redFlags: [t('Развитие панкреонекроза, полиорганная недостаточность, дыхательная недостаточность (ОАРДС)', 'Панкреонекроз дамуы, полиорганды жетіспеушілік', 'Pancreatic necrosis, organ failure (ARF, ARDS, shock)')],
    },
    expectedActions: ['girdle_pain_palpation', 'serum_lipase_amylase', 'aggressive_iv_fluids', 'analgesia'],
    dangerousActions: ['give_oral_food_during_severe_vomiting', 'inadequate_fluid_resuscitation'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // ENDOCRINOLOGY
  'hypoglycemia': {
    correctDiagnosis: { code: 'E16.2', name: t('Тяжёлая гипогликемия у пациента с сахарным диабетом 1 типа', '1 патшалы қант диабеті бар науқастағы ауыр гипогликемия', 'Severe hypoglycemia in type 1 diabetes'), required: true },
    differentials: [
      { code: 'E16.2', name: t('Гипогликемия', 'Гипогликемия', 'Hypoglycemia'), required: true },
      { code: 'I63.9', name: t('Острое нарушение мозгового кровообращения', 'Ми қан айналымының жедел бұзылысы', 'Stroke') },
      { code: 'G40.9', name: t('Судорожный синдром', 'Тырысу синдромы', 'Seizure disorder') },
      { code: 'F10.0', name: t('Острое опьянение', 'Жедел мас болу', 'Acute intoxication') },
    ],
    examinations: [
      { id: 'bedside_glucose', category: 'general', label: t('Экспресс-глюкометрия (Критическое действие!)', 'Глюкометрия (Шұғыл!)', 'Bedside blood glucose (Critical action!)'), result: t('Глюкоза крови: 1.8 ммоль/л (Критическое снижение < 3.9 ммоль/л!).', 'Қан глюкозасы: 1.8 ммоль/л (Критикалық төмендеу!).', 'Bedside blood glucose: 1.8 mmol/L (Critically low < 3.9 mmol/L!).'), relevant: true },
      { id: 'skin_neuro', category: 'general', label: t('Осмотр кожных покровов и нейростатус', 'Теріні тексеру және нейростатус', 'Skin & consciousness status'), result: t('Профузный холодный пот, гиперемия лица, крупный тремор рук, дезориентация.', 'Профузды салқын тер, қолдардың ірі треморы, дезориентация.', 'Profuse cold diaphoresis, facial flushing, coarse hand tremor, disorientation.'), relevant: true },
      { id: 'cardiac_vitals', category: 'cardiovascular', label: t('Аускультация сердца и ЧСС', 'Жүректі аускультациялау', 'Cardiac auscultation & pulse'), result: t('Синусовая тахикардия 112 в мин, АД 118/72 мм рт.ст.', 'Синусты тахикардия 112 мин.', 'Sinus tachycardia 112 bpm, BP 118/72 mmHg.'), relevant: true },
    ],
    investigations: [
      { id: 'lab_glucose', category: 'laboratory', name: t('Лабораторная глюкоза венозной крови', 'Венозды қан глюкозасы', 'Laboratory venous glucose'), result: t('Глюкоза венозной плазмы: 1.9 ммоль/л.', 'Венозды плазма глюкозасы: 1.9 ммоль/л.', 'Venous plasma glucose: 1.9 mmol/L.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'electrolytes', category: 'laboratory', name: t('Электролиты (K, Na)', 'Электролиттер', 'Electrolytes'), result: t('Калий: 3.8 ммоль/л, Натрий: 138 ммоль/л.', 'Калий: 3.8 ммоль/л, Натрий: 138 ммоль/л.', 'K: 3.8 mmol/L, Na: 138 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'hba1c', category: 'laboratory', name: t('Гликированный гемоглобин (HbA1c)', 'Гликирленген гемоглобин', 'HbA1c'), result: t('HbA1c: 8.8% (Плохой компенсаторный контроль).', 'HbA1c: 8.8%.', 'HbA1c: 8.8% (Suboptimal glycemic control).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'c_peptide', category: 'laboratory', name: t('С-пептид крови', 'Қан С-пептиді', 'Serum C-peptide'), result: t('С-пептид: 0.1 нг/мл (Выраженная эндогенная инсулинопения).', 'С-пептид: 0.1 нг/мл.', 'C-peptide: 0.1 ng/mL (Exogenous insulin administration / absolute T1D deficiency).'), cost: 4, delayMs: 2000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Немедленное купирование гипогликемии (Правило 15 грамм углеводов или в/в глюкоза)', 'Гипогликемияны шұғыл тоқтату', 'Immediate hypoglycemia correction')],
      medications: [t('При сохранении сознания: 15-20 г быстрых углеводов (сок, сахар, гели)', 'Есі барда: 15-20 г жылдам көмірсулар', 'If conscious: 15-20 g fast-acting carbohydrates (juice, sugar tablets)'), t('При нарушении сознания: 40-80 мл 40% раствора глюкозы (декстрозы) в/в струйно', 'Есі бұзылғанда: 40-80 мл 40% глюкоза (декстроза) т/і', 'If unconscious: 40-80 mL 40% IV Dextrose bolus'), t('Глюкагон 1 мг в/м при невозможности в/в доступа', 'Тамыр ішілік қолжетімділік болмаса Глюкагон 1 мг б/і', 'Glucagon 1 mg IM if IV access unavailable')],
      nonDrug: [t('Повторный контроль глюкозы крови через 15 минут!', '15 минуттан кейін қан глюкозасын қайта бақылау!', 'Recheck blood glucose in 15 minutes!')],
      disposition: t('Амбулаторно после нормализации глюкозы > 5.6 ммоль/л и коррекции дозы инсулина', 'Глюкоза қалыпқа келгеннен кейін амбулаториялық', 'Discharge once glucose > 5.6 mmol/L and patient asymptomatic'),
      followUp: t('Коррекция инсулинотерапии эндокринологом, обучение правилам профилактики гипогликемии', 'Эндокринологтың инсулинотерапияны түзетуі', 'Endocrinology follow-up, re-education on insulin dosing'),
      redFlags: [t('Некупируемая гипогликемия на фоне приёма сульфонилмочевины (требует инфузии 10% декстрозы и госпитализации)', 'Сульфонилмочевина фонында тоқтатылмайтын гипогликемия', 'Refractory hypoglycemia (sulfonylurea-induced, requires hospital admission)')],
    },
    expectedActions: ['bedside_glucose_stat', 'iv_dextrose_or_fast_carbs', 'recheck_glucose_15min', 'insulin_history_check'],
    dangerousActions: ['administer_insulin_to_unconscious_diabetic', 'delay_glucose_for_ct_scan'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'dka': {
    correctDiagnosis: { code: 'E10.1', name: t('Диабетический кетоацидоз тяжёлой степени', 'Ауыр дәрежелі диабеттік кетоацидоз', 'Diabetic ketoacidosis (DKA), severe'), required: true },
    differentials: [
      { code: 'E10.1', name: t('Диабетический кетоацидоз', 'Диабеттік кетоацидоз', 'Diabetic ketoacidosis'), required: true },
      { code: 'E11.0', name: t('Гиперосмолярное гипергликемическое состояние (ГГС)', 'Гиперосмолярлы гипергликемиялық күй', 'Hyperosmolar hyperglycemic state') },
      { code: 'K35.8', name: t('Острый живот / аппендицит', 'Жедел іш', 'Acute abdomen') },
      { code: 'K85.9', name: t('Острый панкреатит', 'Жедел панкреатит', 'Acute pancreatitis') },
    ],
    examinations: [
      { id: 'kussmaul_breath', category: 'respiratory', label: t('Оценка характера дыхания и запаха в выдыхаемом воздухе', 'Тыныс алу сипатын және иісті бағалау', 'Kussmaul breathing & acetone odor'), result: t('Шумное глубокое дыхание Куссмауля (ЧДД 30 в мин). Запах ацетона (прелых яблок) в выдыхаемом воздухе.', 'Шулы терең Куссмауль тынысы (ТЖ 30 мин). Запах ацетона.', 'Deep rapid Kussmaul respiration (RR 30 bpm). Fruity acetone breath odor.'), relevant: true },
      { id: 'dehydration_status', category: 'general', label: t('Оценка степени дегидратации', 'Дегидратация дәрежесін бағалау', 'Dehydration & skin turgor'), result: t('Сухость слизистых оболочек, сниженный тургор кожи, западение глазных яблок. АД 96/62 мм рт.ст.', 'Слизистің құрғауы, тері тургорының төмендеуі. АД 96/62 мм б.б.', 'Severe mucosal dryness, decreased skin turgor, sunken eyes. BP 96/62 mmHg.'), relevant: true },
      { id: 'cardiac_vitals_dka', category: 'cardiovascular', label: t('Аускультация сердца и оценка пульса', 'Жүректі аускультациялау', 'Cardiac auscultation & pulse'), result: t('Тахикардия 126 в мин, тоны сердца ритмичные, ослаблены. АД 96/62 мм рт.ст.', 'Тахикардия 126 мин.', 'Tachycardia 126 bpm, BP 96/62 mmHg.'), relevant: true },
    ],
    investigations: [
      { id: 'blood_glucose', category: 'laboratory', name: t('Глюкоза плазмы крови', 'Қан плазмасының глюкозасы', 'Blood Glucose'), result: t('Глюкоза крови: 28.4 ммоль/л (Высокая гипергликемия).', 'Қан глюкозасы: 28.4 ммоль/л.', 'Blood glucose: 28.4 mmol/L.'), cost: 1, delayMs: 500, indicated: true },
      { id: 'ketones', category: 'laboratory', name: t('Кетоны крови / мочи', 'Қан / зәр кетондары', 'Blood & Urine Ketones'), result: t('Бета-гидроксибутират крови: 5.8 ммоль/л (Норма < 0.6). Ацетон мочи (++++).', 'Бета-гидроксибутират: 5.8 ммоль/л. Зәр ацетоны (++++).', 'Blood beta-hydroxybutyrate: 5.8 mmol/L (Normal < 0.6). Urine ketones (++++).'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'abg', category: 'laboratory', name: t('Газы артериальной крови (pH, HCO3, Anion Gap)', 'Артериялық қан газдары', 'Arterial Blood Gas (pH, HCO3)'), result: t('pH 7.12, HCO3 9.4 ммоль/л, PaCO2 24 мм рт.ст. Анионный интервал (Anion Gap) = 22 (Тяжёлый метаболический ацидоз).', 'pH 7.12, HCO3 9.4 ммоль/л, PaCO2 24 мм б.б. Аниондық интервал = 22.', 'pH 7.12, HCO3 9.4 mmol/L, PaCO2 24 mmHg. Anion Gap = 22 (Severe metabolic acidosis).'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'electrolytes_potassium', category: 'laboratory', name: t('Калий, Натрий сыворотки (Критический контроль!)', 'Сарысулық калий, натрий', 'Serum Potassium & Sodium (Critical!)'), result: t('Калий: 4.8 ммоль/л, Натрий: 132 ммоль/л.', 'Калий: 4.8 ммоль/л, Натрий: 132 ммоль/л.', 'Potassium: 4.8 mmol/L, Sodium: 132 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Экстренная госпитализация в реанимационное отделение (ОРИТ)', 'ОРИТ-ке шұғыл госпитализациялау', 'Immediate ICU admission'), t('Регидратация (0.9% NaCl 1000 мл в 1-й час, далее 500 мл/ч)', 'Регидратация (0.9% NaCl 1000 мл алғашқы сағатта)', 'Aggressive IV fluid rehydration (0.9% Normal Saline 1 L in 1st hour)')],
      medications: [t('Непрерывная в/в инфузия инсулина короткого действия (0.1 ЕД/кг/час) ПОСЛЕ начала регидратации и при K > 3.3 ммоль/л', 'Қысқа әсерлі инсулиннің үздіксіз т/і инфузиясы (0.1 ЕД/кг/сағ)', 'Continuous IV short-acting insulin infusion (0.1 U/kg/hr) AFTER fluids and K > 3.3 mmol/L'), t('Замещение калия (добавление 20-30 ммоль KCl на литр физраствора при K < 5.2)', 'Калийді орнына толтыру (KCl қосу)', 'Potassium replacement (20-30 mEq/L fluid if K < 5.2 mmol/L)')],
      nonDrug: [t('Мониторинг диуреза (установка катетера Фолея), гликемический профиль каждый час', 'Диурезді бақылау, сағат сайын гликемия', 'Hourly blood glucose & fluid balance monitoring via Foley catheter')],
      disposition: t('Госпитализация в отделение реанимации и интенсивной терапии (ОРИТ)', 'Реанимация және қарқынды терапия бөлімшесіне госпитализациялау', 'Admission to Intensive Care Unit (ICU)'),
      followUp: t('Перевод на подкожную инсулинотерапию после ликвидации кетоацидоза (pH > 7.30, HCO3 > 18)', 'Кетоацидоз жойылғаннан кейін тері асты инсулиніне ауыстыру', 'Transition to SC insulin once DKA resolves (pH > 7.30, HCO3 > 18)'),
      redFlags: [t('Развитие отёка головного мозга (брадикардия, головная боль, сопор при быстром снижении осмолярности)', 'Бас миының ісінуі (брадикардия, бас ауыруы, естің бұзылуы)', 'Cerebral edema (headache, bradycardia, lethargy during rapid osmolality drop)')],
    },
    expectedActions: ['kussmaul_breath_check', 'ketones_abg_test', 'iv_normal_saline_first', 'potassium_monitoring', 'iv_insulin_drip'],
    dangerousActions: ['bolus_bicarbonate_without_severe_acidosis', 'insulin_drip_without_potassium_check', 'hypotonic_fluids_too_early'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'thyrotoxicosis': {
    correctDiagnosis: { code: 'E05.0', name: t('Тиреотоксикоз с диффузным зобом (Болезнь Грейвса)', 'Диффузды зобпен тиреотоксикоз (Грейвс ауруы)', 'Thyrotoxicosis with diffuse goiter (Graves disease)'), required: true },
    differentials: [
      { code: 'E05.0', name: t('Тиреотоксикоз (Болезнь Грейвса)', 'Тиреотоксикоз (Грейвс ауруы)', 'Thyrotoxicosis (Graves disease)'), required: true },
      { code: 'F41.1', name: t('Генерализованное тревожное расстройство', 'Жалпыланған үрейлі бұзылыс', 'Generalized anxiety disorder') },
      { code: 'I48.0', name: t('Фибрилляция предсердий изолированная', 'Оқшауланған жүрекше фибрилляциясы', 'Isolated atrial fibrillation') },
      { code: 'E06.2', name: t('Посттиреоидитный тиреотоксикоз', 'Посттиреоидитті тиреотоксикоз', 'Subacute thyroiditis') },
    ],
    examinations: [
      { id: 'thyroid_gland', category: 'general', label: t('Пальпация щитовидной железы', 'Қалқанша безді пальпациялау', 'Thyroid gland palpation'), result: t('Диффузное увеличение щитовидной железы 2 ст., безболезненная, мягко-эластичная. Систолический шум над железой.', 'Қалқанша бездің 2 дәрежелі диффузды үлкеюі, ауырсынусыз.', 'Diffusely enlarged Grade 2 thyroid, non-tender, soft-elastic. Vascular bruit heard over gland.'), relevant: true },
      { id: 'eye_signs', category: 'general', label: t('Оценка глазных симптомов (Эндокринопатия)', 'Көз белгілерін бағалау', 'Ophthalmopathy assessment'), result: t('Экзофтальм умеренный двусторонний. Положительные симптомы Грефе, Кохера, Мебиуса.', 'Орташа екіжақты экзофтальм. Грефе, Кохер, Мебиус белгілері оң.', 'Bilateral exophthalmos. Positive Graefe, Kocher, and Moebius signs.'), relevant: true },
      { id: 'hand_tremor', category: 'neurological', label: t('Симптом Мари (Тремор рук)', 'Мари белгісі (Қол дірілі)', 'Marie sign (Hand tremor)'), result: t('Выраженный мелкоамплитудный тремор пальцев вытянутых рук.', 'Созылған қол саусақтарының айқын ұсақ аплитудалы дірілі.', 'Fine tremor of outstretched fingers (Marie sign positive).'), relevant: true },
    ],
    investigations: [
      { id: 'tsh_ft4', category: 'laboratory', name: t('ТТГ, свободный Т3, свободный Т4', 'ТТГ, бос Т3, бос Т4', 'TSH, Free T3, Free T4'), result: t('ТТГ: < 0.01 мМЕ/л (Подавлен), Свободный Т4: 48.6 пмоль/л (Норма 10-22), Свободный Т3: 18.2 пмоль/л (Резко повышен!).', 'ТТГ: < 0.01 мМЕ/л, Бос Т4: 48.6 пмоль/л, Бос Т3: 18.2 пмоль/л.', 'TSH: < 0.01 mIU/L (Suppressed), Free T4: 48.6 pmol/L (High), Free T3: 18.2 pmol/L (Markedly high!).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'tsh_receptor_ab', category: 'laboratory', name: t('Антитела к рецепторам ТТГ (ат-рТТГ)', 'ТТГ рецепторларына антиденелер', 'TSH receptor antibodies (TRAb)'), result: t('Ат-рТТГ: 14.5 ЕД/л (Норма < 1.75) — подтверждает Болезнь Грейвса.', 'Ат-рТТГ: 14.5 ЕД/л (Норма < 1.75) — Грейвс ауруын растайды.', 'TRAb: 14.5 U/L (Normal < 1.75) — confirms Graves disease.'), cost: 4, delayMs: 3000, indicated: true },
      { id: 'us_thyroid', category: 'imaging', name: t('УЗИ щитовидной железы', 'Қалқанша бездің УЗИ', 'Thyroid Ultrasound'), result: t('Диффузное увеличение объема (34 куб.см), усиление кровотока ("щитовидный пожар").', 'Көлемінің диффузды үлкеюі (34 куб.см), қан ағымының күшеюі.', 'Diffusely enlarged thyroid (34 mL), marked hypervascularity ("thyroid thyroid storm pattern").'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'cbc_thyro', category: 'laboratory', name: t('Общий анализ крови (Контроль лейкоцитов)', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 5.4 х 10^9/л, Нейтрофилы: 62% (Норма).', 'Лейкоциттер: 5.4 х 10^9/л.', 'WBC: 5.4 x 10^9/L, Neutrophils: 62% (Normal baseline).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Назначение тиреостатической терапии', 'Тиреостатикалық терапияны тағайындау', 'Initiate antithyroid drug therapy')],
      medications: [t('Тиамазол (Тирозол / Мерказолил) 30-40 мг/сут в 2-3 приёма', 'Тиамазол (Тирозол) 30-40 мг/тәул', 'Thiamazole (Methimazole) 30-40 mg/day in divided doses'), t('Бета-блокаторы (Пропранолол 20-40 мг 3 раза/сут или Атенолол 50 мг/сут) для симпатикотонии', 'Пропранолол 20-40 мг 3 рет/тәул', 'Beta-blockers (Propranolol 20-40 mg TID) for sympathetic control')],
      nonDrug: [t('Исключить инсоляцию, йодсодержащие добавки, курение', 'Инсоляцияны, йод қоспаларын шектеу', 'Avoid iodine supplements, excess sun exposure, and smoking')],
      disposition: t('Амбулаторное наблюдение эндокринолога', 'Эндокринологтың амбулаториялық бақылауы', 'Outpatient endocrinology management'),
      followUp: t('Контроль ОАК (лейкоциты!) каждые 2 недели и Т4 св. через 4 недели', '2 апта сайын ОАК (лейкоциттер!) және 4 аптадан кейін Т4 бос бақылау', 'Monitor CBC (WBC/granulocytes) every 2 weeks & Free T4 in 4 weeks'),
      redFlags: [t('Развитие агранулоцитоза (боль в горле, лихорадка) или тиреотоксического криза (гипертермия > 40°C, тахикардия > 150, бред)', 'Агранулоцитоз дамуы (тамақ ауыруы, қызба) немесе тиреотоксикалық криз', 'Agranulocytosis (fever, sore throat) or thyroid storm (fever > 40°C, extreme tachycardia, delirium)')],
    },
    expectedActions: ['thyroid_palpation', 'tsh_ft4_labs', 'thiamazole_start', 'beta_blocker_control'],
    dangerousActions: ['prescribe_radioactive_iodine_in_pregnancy', 'ignore_fever_sore_throat_on_thiamazole'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'hypothyroid-myxedema': {
    correctDiagnosis: { code: 'E03.9', name: t('Первичный манифестный гипотиреоз', 'Біріншілік манифестті гипотиреоз', 'Primary overt hypothyroidism'), required: true },
    differentials: [
      { code: 'E03.9', name: t('Первичный гипотиреоз', 'Біріншілік гипотиреоз', 'Primary hypothyroidism'), required: true },
      { code: 'F32.9', name: t('Депрессивный эпизод', 'Депрессиялық эпизод', 'Depressive episode') },
      { code: 'D50.9', name: t('Железодефицитная анемия', 'Темір тапшылығы анемиясы', 'Iron deficiency anemia') },
      { code: 'N18.9', name: t('Хроническая болезнь почек (микседема отёк)', 'Созылмалы бүйрек ауруы', 'Chronic kidney disease') },
    ],
    examinations: [
      { id: 'periorbital_edema', category: 'general', label: t('Осмотр лица, кожи и сужение голоса', 'Бетті, теріні тексеру және дауыс өзгеруі', 'Face & skin inspection (Myxedema)'), result: t('Одутловатость лица, периорбитальный отёк, сухая холодная кожа, охриплый низкий голос.', 'Беттің ісінуі, периорбиталық ісіну, құрғақ салқын тері, қарлыққан дауыс.', 'Facial puffiness, periorbital edema, dry cold skin, hoarse low-pitched voice.'), relevant: true },
      { id: 'reflexes_bradycardia', category: 'neurological', label: t('Ахилловы рефлексы и ЧСС', 'Ахилл рефлекстері және ЖҮС', 'Achilles reflexes & heart rate'), result: t('Замедление фазы расслабления ахилловых рефлексов. Брадикардия 52 в мин.', 'Ахилл рефлекстерінің босаңсу фазасының баяулауы. Брадикардия 52 мин.', 'Delayed relaxation phase of Achilles reflex. Bradycardia 52 bpm.'), relevant: true },
      { id: 'thyroid_palp_hypo', category: 'general', label: t('Пальпация щитовидной железы', 'Қалқанша безді пальпациялау', 'Thyroid palpation'), result: t('Щитовидная железа уменьшена в объеме, плотно-эластическая, безболезненная.', 'Қалқанша безі көлемі азайған, тығыз.', 'Thyroid gland small, firm, non-tender (atrophic Hashimoto pattern).'), relevant: true },
    ],
    investigations: [
      { id: 'tsh_ft4', category: 'laboratory', name: t('ТТГ и свободный Т4', 'ТТГ және бос Т4', 'TSH & Free T4'), result: t('ТТГ: 24.5 мМЕ/л (Резко повышен > 4.0), Свободный Т4: 5.1 пмоль/л (Снижен < 10.0).', 'ТТГ: 24.5 мМЕ/л (Шұғыл жоғарылаған), Бос Т4: 5.1 пмоль/л (Төмендеген).', 'TSH: 24.5 mIU/L (Significantly high), Free T4: 5.1 pmol/L (Low).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'anti_tpo', category: 'laboratory', name: t('Антитела к ТПО (ат-ТПО)', 'ТПО-ға антиденелер', 'Anti-TPO antibodies'), result: t('Ат-ТПО: 480 ЕД/мл (Положительный — Аутоиммунный тиреоидит Хашимато).', 'Ат-ТПО: 480 ЕД/мл (Оң — Хашимато аутоиммунды тиреоидиті).', 'Anti-TPO: 480 U/mL (Positive — Hashimoto thyroiditis).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'lipid_panel', category: 'laboratory', name: t('Липидный спектр крови', 'Қанның липидтік спектрі', 'Lipid profile'), result: t('Общий холестерин: 8.2 ммоль/л, ЛПНП: 5.4 ммоль/л (Выраженная гиперхолестеринемия).', 'Жалпы холестерин: 8.2 ммоль/л, ТТЛП: 5.4 ммоль/л.', 'Total cholesterol: 8.2 mmol/L, LDL-C: 5.4 mmol/L (Severe hypercholesterolemia).'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'cbc_hypo', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Гемоглобин: 104 г/л, Эритроциты: 3.6 х 10^12/л (Нормохромная анемия при гипотиреозе).', 'Гемоглобин: 104 г/л.', 'Hb: 104 g/L, RBC: 3.6 x 10^12/L (Mild normochromic anemia of hypothyroidism).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Заместительная гормональная терапия Левотироксином (L-тироксин)', 'Левотироксинмен орынбасушы гормондық терапия', 'Levothyroxine replacement therapy')],
      medications: [t('Левотироксин натрия 1.6 мкг/кг/сут (начинать с 25-50 мкг/сут утром натощак за 30-40 мин до еды)', 'Левотироксин натрий 25-50 мкг/тәул таңертең аш қарынға', 'Levothyroxine 25-50 mcg daily (starter dose), taken in the morning on empty stomach 30-40 mins before breakfast')],
      nonDrug: [t('Правила приема L-тироксина (не запивать молоком/кофе, не совмещать с препаратами железа и кальция)', 'L-тироксинді қабылдау ережелері', 'Take with water only, separate from calcium/iron supplements by 4 hours')],
      disposition: t('Амбулаторное наблюдение у эндокринолога', 'Эндокринологта амбулаториялық бақылау', 'Outpatient endocrinology management'),
      followUp: t('Контроль ТТГ через 6-8 недель для титрации дозы', 'Дозаны титрлеу үшін 6-8 аптадан кейін ТТГ бақылау', 'Recheck TSH in 6-8 weeks for dose titration'),
      redFlags: [t('Микседематозная кома (гипотермия < 35°C, тяжелая брадикардия, гиповентиляция, ступор)', 'Микседематозды кома (гипотермия < 35°C, брадикардия, ступор)', 'Myxedema coma (hypothermia < 35°C, severe bradycardia, hypoventilation, coma)')],
    },
    expectedActions: ['periorbital_edema_exam', 'tsh_ft4_labs', 'levothyroxine_start', 'patient_education_empty_stomach'],
    dangerousActions: ['start_full_dose_levothyroxine_in_elderly_with_cad', 'give_sedatives_to_bradycardic_patient'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // INFECTIOUS
  'viral-uri': {
    correctDiagnosis: { code: 'J06.9', name: t('Острая респираторная вирусная инфекция (ОРВИ)', 'Жоғарғы тыныс жолдарының жедел вирустық инфекциясы (ЖРВИ)', 'Acute viral upper respiratory infection'), required: true },
    differentials: [
      { code: 'J06.9', name: t('Острая вирусная инфекция (ОРВИ)', 'Острая вирусная инфекция (ОРВИ)', 'Acute viral URI'), required: true },
      { code: 'J02.9', name: t('Острый стрептококковый тонзиллит', 'Жедел стрептококкты тонзиллит', 'Acute streptococcal pharyngitis') },
      { code: 'J11.1', name: t('Грипп', 'Тұмау', 'Influenza') },
    ],
    examinations: [
      { id: 'pharynx_exam', category: 'respiratory', label: t('Осмотр зева и миндалин', 'Жұтқыншақ пен бадамша бездерді тексеру', 'Oropharyngeal inspection'), result: t('Умеренная гиперемия задней стенки глотки и нёбных дужек. Налётов на миндалинах нет.', 'Жұтқыншақтың артқы қабырғасының орташа гиперемиясы. Налеттер жоқ.', 'Mild erythema of posterior pharynx and palatine arches. No tonsillar exudate.'), relevant: true },
      { id: 'cervical_nodes', category: 'general', label: t('Пальпация шейных лимфоузлов', 'Мойын лимфа түйіндерін пальпациялау', 'Cervical lymph node palpation'), result: t('Переднешейные лимфоузлы мягкие, слегка чувствительные, не спаяны.', 'Мойын лимфа түйіндері жұмсақ, сәл сезімтал.', 'Anterior cervical nodes soft, slightly tender, mobile.'), relevant: true },
      { id: 'lung_ausc_uri', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Везикулярное дыхание над всеми легочными полями, хрипов нет.', 'Барлық өкпеде везикулярлық тыныс, сырылдар жоқ.', 'Normal vesicular breath sounds, no rales.'), relevant: true },
    ],
    investigations: [
      { id: 'strep_test', category: 'laboratory', name: t('Экспресс-тест на БГСА (Стрептатест)', 'БГСА экспресс-тесті (Стрептатест)', 'Rapid Strep A antigen test'), result: t('Тест отрицательный (Стрептококковый фарингит исключен).', 'Тест теріс.', 'Rapid Strep test negative.'), cost: 2, delayMs: 500, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 6.2 х 10^9/л, Лимфоциты: 42% (умеренный лимфоцитоз), СОЭ: 12 мм/ч.', 'Лейкоциттер: 6.2 х 10^9/л, Лимфоциттер: 42%, ЭТЖ: 12 мм/сағ.', 'WBC: 6.2 x 10^9/L, Lymphocytes: 42%, ESR: 12 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'flu_ag_rapid', category: 'laboratory', name: t('Экспресс-тест на вирусы Гриппа А и В', 'Тұмау вирустарына экспресс-тест', 'Rapid Influenza A/B antigen test'), result: t('Экспресс-тест отрицательный.', 'Экспресс-тест теріс.', 'Rapid flu antigen test negative.'), cost: 2, delayMs: 500, indicated: true },
      { id: 'crp_uri', category: 'laboratory', name: t('С-реактивный белок (СРБ)', 'С-реактивті ақуыз (СРБ)', 'C-Reactive Protein (CRP)'), result: t('СРБ: 8 мг/л (Норма < 5 мг/л) — незначительное повышение.', 'СРБ: 8 мг/л.', 'CRP: 8 mg/L (Mild elevation).'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Симптоматическое лечение, нецелесообразность антибиотиков', 'Симптоматикалық емдеу, антибиотиктер қажет емес', 'Symptomatic supportive treatment; antibiotics NOT indicated')],
      medications: [t('Парацетамол 500 мг или Ибупрофен 400 мг при T > 38.5°C или боли в горле', 'Парацетамол 500 мг немесе Ибупрофен 400 мг', 'Paracetamol 500 mg or Ibuprofen 400 mg PRN for fever/throat pain'), t('Солевые промывания носа (Аква Марис) + Деконгенстанты не более 3-5 дней', 'Мұрынға тұзды ерітінділер', 'Nasal saline sprays + short-term decongestants (< 3-5 days)')],
      nonDrug: [t('Обильное тёплое питьё (2-2.5 л/сут), домашний режим, увлажнение воздуха', 'Мол жылы сусын, үйдегі режим', 'Plenty of warm fluids, rest, room humidification')],
      disposition: t('Амбулаторное лечение с оформлением листа нетрудоспособности', 'Амбулаториялық емдеу', 'Outpatient supportive care'),
      followUp: t('Повторный осмотр при сохранении лихорадки более 3-5 дней', 'Қызба 3-5 күннен артық сақталса қайта тексеру', 'Recheck if fever persists > 3-5 days or symptoms worsen'),
      redFlags: [t('Появление одышки, боли в груди, гнойной мокроты, высокой лихорадки > 39°C более 5 дней', 'Ентігу, кеудедегі ауырсыну, 39°C жоғары қызба 5 күннен артық сақталуы', 'Development of dyspnea, chest pain, high fever > 39°C > 5 days')],
    },
    expectedActions: ['pharynx_exam', 'strep_test', 'symptomatic_care_only', 'refuse_systemic_antibiotics'],
    dangerousActions: ['prescribe_systemic_antibiotics_for_uncomplicated_viral_uri', 'prescribe_systemic_steroids'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'influenza': {
    correctDiagnosis: { code: 'J11.1', name: t('Грипп тип А, среднетяжёлое течение', 'А типі Тұмау, орташа ауырлықтағы ағымы', 'Influenza A, moderate severity'), required: true },
    differentials: [
      { code: 'J11.1', name: t('Грипп', 'Тұмау', 'Influenza'), required: true },
      { code: 'J06.9', name: t('ОРВИ другой этиологии', 'Басқа этиологиялы ЖРВИ', 'Viral URI (non-flu)') },
      { code: 'U07.1', name: t('COVID-19', 'COVID-19', 'COVID-19') },
    ],
    examinations: [
      { id: 'toxic_syndrome', category: 'general', label: t('Оценка интоксикационного синдрома', 'Интоксикациялық синдромды бағалау', 'Toxic-inflammatory syndrome screening'), result: t('Выраженная гипертермия 39.2°C, склерит, инъецированность сосудов конъюнктивы, миалгии.', 'Айқын гипертермия 39.2°C, склерит, миалгия.', 'Severe fever 39.2°C, conjunctival injection, severe myalgias & retro-orbital pain.'), relevant: true },
      { id: 'lung_auscultation', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Жесткое дыхание, хрипов нет. SpO2: 96%.', 'Қатаң тыныс, сырылдар жоқ. SpO2: 96%.', 'Harsh vesicular breath sounds, no rales. SpO2: 96%.'), relevant: true },
      { id: 'throat_flu', category: 'respiratory', label: t('Осмотр зева', 'Жұтқыншақты тексеру', 'Pharynx inspection'), result: t('Яркая гиперемия задней стенки глотки со зернистостью.', 'Жұтқыншақтың артқы қабырғасының яркая гиперемиясы.', 'Vivid erythema of posterior pharynx wall with granular follicles.'), relevant: true },
    ],
    investigations: [
      { id: 'flu_pcr', category: 'laboratory', name: t('ПЦР / Экспресс-тест на вирус Гриппа А и В', 'Тұмау А және В вирусына ПЦР/экспресс-тест', 'Rapid Influenza A/B antigen / PCR test'), result: t('Экспресс-тест: Положительный на Грипп А (Influenza A Positive).', 'Экспресс-тест: А Тұмауына оң (Influenza A Positive).', 'Rapid flu test: Positive for Influenza A.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкопения (3.8 х 10^9/л), относительный лимфоцитоз, СОЭ 18 мм/ч.', 'Лейкопения (3.8 х 10^9/л), лимфоцитоз, ЭТЖ 18 мм/сағ.', 'Leukopenia (3.8 x 10^9/L), relative lymphocytosis, ESR 18 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'covid_rapid_flu', category: 'laboratory', name: t('Экспресс-тест на SARS-CoV-2', 'SARS-CoV-2 экспресс-тесті', 'Rapid COVID-19 antigen test'), result: t('Тест отрицательный.', 'Тест теріс.', 'COVID-19 antigen test negative.'), cost: 2, delayMs: 500, indicated: true },
      { id: 'cxr_flu', category: 'imaging', name: t('Рентгенография ОГК', 'Кеуде торы рентгенографиясы', 'Chest X-ray'), result: t('Усиление легочного рисунка в базальных отделах, инфильтратов нет.', 'Өкпе суретінің күшеюі, инфильтраттар жоқ.', 'Increased bronchovascular markings, no focal pulmonary infiltrate.'), cost: 3, delayMs: 2000, indicated: false },
    ],
    managementPlan: {
      recommendations: [t('Назначение специфической этиотропной противовирусной терапии в первые 48 часов', 'Алғашқы 48 сағатта спецификалық вирусқа қарсы терапия', 'Start specific neuraminidase inhibitor antiviral therapy within 48 hours')],
      medications: [t('Осельтамивир (Тамифлю) 75 мг 2 раза/сут перорально 5 дней', 'Осельтамивир (Тамифлю) 75 мг 2 рет/тәул ішке 5 күн', 'Oseltamivir (Tamiflu) 75 mg BID orally for 5 days'), t('Парацетамол 500 мг или Ибупрофен 400 мг при T > 38.5°C', 'Парацетамол 500 мг немесе Ибупрофен 400 мг', 'Paracetamol 500 mg or Ibuprofen 400 mg for fever > 38.5°C')],
      nonDrug: [t('Постельный режим, обильное витаминизированное питьё', 'Төсек режимі, мол сұйықтық', 'Strict bed rest, fluids')],
      disposition: t('Амбулаторное лечение (Изоляция дома)', 'Үйде амбулаториялық емдеу', 'Home isolation & outpatient management'),
      followUp: t('Повторный осмотр на 3-й день болезни', 'Аурудың 3-ші күні қайта тексеру', 'Re-evaluation on day 3 of therapy'),
      redFlags: [t('Присоединение вторичной бактериальной пневмонии (повторная волна лихорадки, одышка, гнойная мокрота)', 'Екіншілік бактериялық пневмонияның қосылуы (қайталанатын қызба, ентігу)', 'Secondary bacterial pneumonia (biphasic fever pattern, purulent sputum, drop in SpO2)')],
    },
    expectedActions: ['flu_rapid_test', 'oseltamivir_start', 'symptomatic_fever_control'],
    dangerousActions: ['prescribe_aspirin_in_children_risk_of_reyessyndrome', 'routine_antibiotics_without_bacterial_superinfection'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'sepsis': {
    correctDiagnosis: { code: 'A41.9', name: t('Сепсис, органно-системная дисфункция (qSOFA = 2)', 'Сепсис, ағзалық-жүйелік дисфункция', 'Sepsis, acute organ dysfunction'), required: true },
    differentials: [
      { code: 'A41.9', name: t('Сепсис', 'Сепсис', 'Sepsis'), required: true },
      { code: 'R57.2', name: t('Септический шок', 'Септикалық шок', 'Septic shock') },
      { code: 'J18.9', name: t('Тяжёлая внебольничная пневмония', 'Ауыр қауымдастықтан тыс пневмония', 'Severe pneumonia') },
    ],
    examinations: [
      { id: 'qsofa_score', category: 'general', label: t('Оценка по шкале qSOFA (ЧДД, Сознание, АД)', 'qSOFA шкаласы бойынша бағалау', 'qSOFA Bedside Score'), result: t('qSOFA = 2 балла: ЧДД 26 в мин (+1), Шкала Комы Глазго 14 (+1), АД 98/60 мм рт.ст. (Высокий риск сепсиса!).', 'qSOFA = 2 балл: ТЖ 26 мин (+1), Глазго есі 14 (+1), АД 98/60 мм б.б.', 'qSOFA = 2 points: RR 26 bpm (+1), GCS 14 (+1), SBP 98 mmHg (High sepsis risk!).'), relevant: true },
      { id: 'perfusion_mottling', category: 'general', label: t('Оценка периферической перфузии и пятнистости кожи', 'Перифериялық перфузияны бағалау', 'Peripheral perfusion & mottling score'), result: t('Симптом "белого пятна" > 4 сек, мраморность кожи коленей (Mottling score 2).', '«Ақ дақ» белгісі > 4 сек, тізе терісінің мәрмәрлігі.', 'Capillary refill time > 4 seconds, knee mottling score 2.'), relevant: true },
      { id: 'auscultation_vitals', category: 'cardiovascular', label: t('Аускультация сердца и оценка пульса', 'Жүректі аускультациялау', 'Cardiac auscultation'), result: t('Выраженная тахикардия 124 в мин, нитевидный пульс слабого наполнения.', 'Айқын тахикардия 124 мин.', 'Severe tachycardia 124 bpm, thready weak pulse.'), relevant: true },
    ],
    investigations: [
      { id: 'lactate', category: 'laboratory', name: t('Лактат крови (Критический маркер!)', 'Қан лактаты', 'Blood Lactate (Critical!)'), result: t('Лактат крови: 3.8 ммоль/л (Норма < 2.0 ммоль/л) — тканевая гипоперфузия.', 'Қан лактаты: 3.8 ммоль/л — тіннің гипоперфузиясы.', 'Blood lactate: 3.8 mmol/L (Normal < 2.0 mmol/L) — severe tissue hypoperfusion.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'blood_cultures', category: 'laboratory', name: t('Посев крови на стерильность (2 флакона до антибиотиков!)', 'Стерильділікке қан егіндісі', 'Blood cultures x 2 sets (before antibiotics!)'), result: t('Взяты 2 пары флаконов. Результат через 48 часов.', '2 жұп құты алынды.', '2 sets of blood cultures obtained prior to antibiotic administration.'), cost: 4, delayMs: 4000, indicated: true },
      { id: 'procalcitonin', category: 'laboratory', name: t('Прокальцитонин (ПКТ)', 'Прокальцитонин (ПКТ)', 'Procalcitonin (PCT)'), result: t('Прокальцитонин: 8.5 нг/мл (Норма < 0.5) — тяжелая бактериальная инфекция/сепсис.', 'Прокальцитонин: 8.5 нг/мл (Норма < 0.5) — ауыр бактериялық инфекция.', 'Procalcitonin: 8.5 ng/mL (Normal < 0.5) — indicative of severe systemic bacterial infection.'), cost: 4, delayMs: 2000, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 22.4 х 10^9/л, Палочки: 18%, Тромбоциты: 95 х 10^9/л (Тромбоцитопения).', 'Лейкоциттер: 22.4 х 10^9/л, Таяқшалар: 18%, Тромбоциттер: 95 х 10^9/л.', 'WBC: 22.4 x 10^9/L, Bands: 18%, Platelets: 95 x 10^9/L (Thrombocytopenia).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Выполнение протокола "Hour-1 Bundle" (Пакет 1-го часа)', '«Hour-1 Bundle» протоколын орындау', 'Execute Surviving Sepsis Campaign "Hour-1 Bundle"'), t('Инфузионная терапия кристаллоидами 30 мл/кг в первые 3 часа', 'Алғашқы 3 сағатта 30 мл/кг кристаллоидтармен инфузия', 'Infuse 30 mL/kg crystalloids within first 3 hours for hypoperfusion')],
      medications: [t('Внутривенные антибиотики широкого спектра (Меропенем 1 г в/в или Цефепим 2 г в/в + Ванкомицин 15-20 мг/кг) в ТЕНИЕ 1 ЧАСА!', 'Алғашқы 1 сағатта кең спектрлі т/і антибиотиктер', 'Empiric broad-spectrum IV antibiotics within 1 HOUR (Meropenem 1 g IV or Cefepime 2 g IV)'), t('Вазопрессоры (Норадреналин в/в инфузия) при рефрактерной гипотонии до сред. АД >= 65 мм рт.ст.', 'Гипотония кезінде Норадреналин т/і инфузиясы', 'Norepinephrine IV vasopressor to maintain Mean Arterial Pressure (MAP) >= 65 mmHg')],
      nonDrug: [t('Контроль центрального венозного давления, инвазивный мониторинг АД, катетеризация мочевого пузыря', 'Орталық венозды қысымды бақылау, катетеризация', 'Invasive BP & CVP monitoring, hourly urine output via Foley catheter')],
      disposition: t('Экстренная госпитализация в отделение реанимации и интенсивной терапии (ОРИТ)', 'ОРИТ-ке шұғыл госпитализациялау', 'Immediate emergency admission to Intensive Care Unit (ICU)'),
      followUp: t('Повторное измерение лактата крови каждые 2-4 часа до нормализации (< 2 ммоль/л)', '2-4 сағат сайын қан лактатын қайта бақылау', 'Re-measure blood lactate every 2-4 hours until cleared'),
      redFlags: [t('Развитие септического шока (рефрактерная гипотония, лактат > 4), ДВС-синдром, ОАРДС', 'Септикалық шок дамуы (рефрактерлі гипотония, лактат > 4), ДВС-синдром', 'Septic shock (refractory hypotension requiring vasopressors, lactate > 4 mmol/L), DIC, ARDS')],
    },
    expectedActions: ['qsofa_eval', 'blood_lactate_stat', 'blood_cultures_before_abx', 'iv_crystalloid_30ml_kg', 'broad_spectrum_abx_within_1hr'],
    dangerousActions: ['delay_antibiotics_beyond_1_hour', 'inadequate_fluid_resuscitation', 'discharge_home'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'covid-like': {
    correctDiagnosis: { code: 'U07.1', name: t('Коронавирусная инфекция (COVID-19), среднетяжёлое течение', 'Коронавирустық инфекция (COVID-19), орташа ауырлықтағы ағымы', 'COVID-19 acute respiratory infection, moderate'), required: true },
    differentials: [
      { code: 'U07.1', name: t('COVID-19', 'COVID-19', 'COVID-19'), required: true },
      { code: 'J11.1', name: t('Грипп', 'Тұмау', 'Influenza') },
      { code: 'J18.9', name: t('Внебольничная пневмония', 'Қауымдастықтан тыс пневмония', 'Community-acquired pneumonia') },
    ],
    examinations: [
      { id: 'anosmia_taste', category: 'neurological', label: t('Оценка аносмии и агевзии', 'Аносмия мен агевзияны бағалау', 'Anosmia & ageusia screening'), result: t('Полная потеря обоняния (аносмия) и вкуса (агевзия) 2 дня.', 'Иіс (аносмия) және дәм сезудің (агевзия) толық жоғалуы 2 күн.', 'Complete sudden loss of smell (anosmia) and taste (ageusia) for 2 days.'), relevant: true },
      { id: 'spo2_eval', category: 'respiratory', label: t('Пульсоксиметрия (SpO2)', 'Пульсоксиметрия', 'Pulse oximetry'), result: t('SpO2: 93% на воздухе.', 'SpO2: 93% бөлме ауасында.', 'SpO2: 93% on room air.'), relevant: true },
      { id: 'lung_ausc_covid', category: 'respiratory', label: t('Аускультация лёгких', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Ослабленное везикулярное дыхание в нижних отделах, нежные крепитирующие хрипы.', 'Төменгі бөлімдерде әлсіреген везикулярлық тыныс, нәзік крепитация.', 'Decreased breath sounds in lower zones, fine bilateral basal crepitations.'), relevant: true },
    ],
    investigations: [
      { id: 'pcr_covid', category: 'laboratory', name: t('ПЦР мазка из носоглотки на SARS-CoV-2', 'SARS-CoV-2-ге мұрын-жұтқыншақ жағындысының ПЦР-і', 'RT-PCR SARS-CoV-2 nasopharyngeal swab'), result: t('ПЦР-тест: Обнаружена РНК SARS-CoV-2 (Положительный).', 'ПЦР-тест: SARS-CoV-2 РНҚ табылды (Оң).', 'RT-PCR test: SARS-CoV-2 RNA Detected (Positive).'), cost: 3, delayMs: 2000, indicated: true },
      { id: 'ct_chest', category: 'imaging', name: t('КТ органов грудной клетки', 'Кеуде торы ағзаларының КТ', 'Chest CT scan'), result: t('Двусторонние участки уплотнения по типу "матового стекла" субплеврально (поражение 25-30%, КТ-1/КТ-2).', 'Екіжақты «күңгірт әйнек» типті тығыздану аймақтары (КТ-1/КТ-2).', 'Bilateral patchy ground-glass opacities subpleurally (25-30% volume, CT-1/CT-2).'), cost: 6, delayMs: 3000, indicated: true },
      { id: 'ferritin_ddimer', category: 'laboratory', name: t('С-реактивный белок, Ферритин, D-димер', 'СРБ, Ферритин, D-димер', 'CRP, Ferritin, D-dimer'), result: t('СРБ: 42 мг/л, Ферритин: 380 нг/мл, D-димер: 680 нг/мл (Умеренная гиперинфламмация).', 'СРБ: 42 мг/л, Ферритин: 380 нг/мл, D-димер: 680 нг/мл.', 'CRP: 42 mg/L, Ferritin: 380 ng/mL, D-dimer: 680 ng/mL.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_covid', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 4.8 х 10^9/л, Лимфоциты: 14% (Лимфопения).', 'Лейкоциттер: 4.8 х 10^9/л, Лимфоциттер: 14%.', 'WBC: 4.8 x 10^9/L, Lymphocytes: 14% (Lymphopenia).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Изоляция пациента, провизорная/инфекционная госпитализация при SpO2 < 94%', 'Науқасты оқшаулау, SpO2 < 94% болғанда госпитализациялау', 'Isolation, inpatient admission if SpO2 < 94%')],
      medications: [t('Противовирусная терапия (Фавипиравир / Нирматрелвир с Ритонавиром) при ранних сроках', 'Вирусқа қарсы терапия', 'Antiviral therapy (Nirmatrelvir/Ritonavir or Favipiravir) if within early window'), t('Профилактические дозы НМГ (Эноксапарин 40 мг/сут с/к) для профилактики тромбозов', 'Тромбоздың алдын алу үшін Эноксапарин 40 мг/тәул т/а', 'Prophylactic LMWH (Enoxaparin 40 mg SC daily) for thrombosis prevention'), t('Дексаметазон 6 мг/сут в/в или внутрь при необходимости оксигенотерапии (SpO2 < 94%)', 'Дексаметазон 6 мг/тәул (SpO2 < 94% болғанда)', 'Dexamethasone 6 mg/day ONLY if supplemental oxygen required')],
      nonDrug: [t('Пронирование (лежание на животе) 12-16 часов в сутки, обильное питьё', 'Прон-позиция (ішпен жату) тәулігіне 12-16 сағат', 'Prone positioning 12-16 hours/day, hydration')],
      disposition: t('Госпитализация в инфекционный стационар', 'Инфекциялық стационарға госпитализациялау', 'Inpatient admission to infectious disease hospital'),
      followUp: t('Контроль SpO2 и пульса каждые 4 часа', '4 сағат сайын SpO2 мен пульсті бақылау', 'Monitor SpO2 and vitals Q4H'),
      redFlags: [t('Десатурация SpO2 < 90%, нарастание цитокинового шторма (высокая лихорадка, СРБ > 100)', 'SpO2 < 90% төмендеуі, цитокиндік шторм', 'Desaturation SpO2 < 90%, cytokine storm escalation')],
    },
    expectedActions: ['covid_pcr_test', 'spo2_monitoring', 'prone_positioning', 'prophylactic_anticoagulation'],
    dangerousActions: ['early_steroids_without_hypoxia', 'routine_antibiotics_without_bacterial_coinfection'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // THERAPY
  'pyelonephritis': {
    correctDiagnosis: { code: 'N10', name: t('Острый необструктивный пиелонефрит правой почки', 'Оң бүйректің жедел необструктивті пиелонефриті', 'Acute right pyelonephritis'), required: true },
    differentials: [
      { code: 'N10', name: t('Острый пиелонефрит', 'Жедел пиелонефрит', 'Acute pyelonephritis'), required: true },
      { code: 'N20.0', name: t('Почечная колика / Почечнокаменная болезнь', 'Бүйрек коликасы', 'Renal colic / Nephrolithiasis') },
      { code: 'N30.0', name: t('Острый цистит', 'Жедел цистит', 'Acute cystitis') },
      { code: 'K35.8', name: t('Острый аппендицит', 'Жедел аппендицит', 'Acute appendicitis') },
    ],
    examinations: [
      { id: 'pasternack_sign', category: 'abdominal', label: t('Поколачивание по поясничной области (Симптом Пастернацкого)', 'Бел аймағын қағу (Пастернацкий белгісі)', 'Costovertebral angle tenderness (Pasternatsky sign)'), result: t('Резко положительный симптом Пастернацкого справа (болезненность при поколачивании). Слева отрицательный.', 'Оң жақта Пастернацкий белгісі шұғыл оң. Сол жақта теріс.', 'Sharply positive costovertebral angle tenderness (CVA tenderness / Pasternatsky sign) on the right side.'), relevant: true },
      { id: 'temp_fever', category: 'general', label: t('Измерение температуры тела и осмотр', 'Дене температурасын өлшеу', 'Temperature & systemic signs'), result: t('Фебрильная лихорадка 39.0°C с ознобом и профузным потом.', 'Фебрильді қызба 39.0°C қалтыраумен.', 'Febrile temperature 39.0°C with rigors and sweating.'), relevant: true },
      { id: 'abdo_pyelo', category: 'abdominal', label: t('Пальпация живота', 'Ішті пальпациялау', 'Abdominal palpation'), result: t('Живот мягкий, болезненный при глубокой пальпации в правом подреберье и флаконной области. Щёткина-Блюмберга теріс.', 'Іші жұмсақ, оң жақ фланкте ауырсыну.', 'Abdomen soft, tender on deep palpation in right flank. No peritoneal signs.'), relevant: true },
    ],
    investigations: [
      { id: 'urinalysis', category: 'laboratory', name: t('Общий анализ мочи (ОАМ)', 'Жалпы зәр анализі', 'Urinalysis'), result: t('Пиурия (Лейкоциты покрывают все п/з), Бактериурия (++++), Белок 0.66 г/л, Нейтрофильные лейкоцитарные цилиндры.', 'Пиурия (Лейкоциттер к/ө жапқан), Бактериурия (++++), Ақуыз 0.66 г/л.', 'Pyuria (WBC cover whole field), Bacteriuria (++++), Protein 0.66 g/L, WBC casts present.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'us_kidneys', category: 'imaging', name: t('УЗИ почек и мочевого пузыря', 'Бүйрек пен зәр қабының УЗИ-і', 'Renal & bladder ultrasound'), result: t('Правая почка увеличена (128х58 мм), паренхима утолщена до 22 мм, эхогенность снижена. ЧЛС не расширена (нет обструкции).', 'Оң бүйрек үлкейген, паренхимасы 22 мм қалыңдаған. ЧЛС кеңеймеген.', 'Right kidney enlarged (128x58 mm), parenchymal thickening 22 mm, hypoechoic. No hydronephrosis/obstruction.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'urine_culture', category: 'laboratory', name: t('Посев мочи на микрофлору и чувствительность', 'Зәр егіндісі', 'Urine culture & susceptibility'), result: t('Выделена Escherichia coli 10^7 КОЕ/мл, чувствительная к Ципрофлоксацину, Цефтриаксону и Фосфомицину.', 'Escherichia coli 10^7 БӨБ/мл бөлінді.', 'Escherichia coli >10^7 CFU/mL, sensitive to Ciprofloxacin, Ceftriaxone, and Nitrofurantoin.'), cost: 4, delayMs: 4000, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоцитоз 16.8 х 10^9/л с сдвигом влево (палочки 14%), СОЭ 38 мм/ч.', 'Лейкоцитоз 16.8 х 10^9/л, таяқшалар 14%, ЭТЖ 38 мм/сағ.', 'WBC: 16.8 x 10^9/L with left shift (bands 14%), ESR: 38 mm/hr.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Эмпирическая антибактериальная терапия, дезинтоксикация', 'Эмпирикалық антибактериалды терапия', 'Empiric oral or parenteral antibiotic therapy')],
      medications: [t('Ципрофлоксацин 500 мг 2 раза/сут перорально 10-14 дней (или Цефтриаксон 1-2 г в/в при средней тяжести)', 'Ципрофлоксацин 500 мг 2 рет/тәул ішке 10-14 күн немесе Цефтриаксон 1-2 г т/і', 'Ciprofloxacin 500 mg BID orally for 10-14 days OR Ceftriaxone 1-2 g IV daily'), t('НПВП (Ибупрофен 400 мг) при боли и лихорадке', 'Ибупрофен 400 мг', 'NSAIDs (Ibuprofen 400 mg) for analgesia & antipyresis')],
      nonDrug: [t('Обильный питьевой режим (2.5-3.0 л/сут, почечные чаи, брусничный отвар)', 'Мол сусын (2.5-3.0 л/тәул)', 'High fluid intake (2.5-3.0 L/day), bed rest until afebrile')],
      disposition: t('Амбулаторное лечение при легком течении / Госпитализация при выраженной интоксикации', 'Амбулаториялық немесе стационарлық емдеу', 'Outpatient management for mild cases; admit if septic or persistent vomiting'),
      followUp: t('Контроль ОАМ и посева мочи через 10-14 дней после завершения антибиотиков', 'Емдеу аяқталғаннан кейін 10-14 күннен кейін Зәр анализін бақылау', 'Repeat urinalysis & urine culture 10-14 days post-treatment'),
      redFlags: [t('Развитие апостематозного пиелонефрита / карбункула почки, уросепсис, анурия', 'Бүйрек карбункулы дамуы, уросепсис, анурия', 'Urosepsis, renal abscess / carbuncle formation, acute renal failure')],
    },
    expectedActions: ['pasternatsky_exam', 'urinalysis', 'renal_ultrasound', 'empiric_antibiotic'],
    dangerousActions: ['prescribe_nitrofurantoin_for_pyelonephritis_tissue_infection', 'discharge_with_high_fever_without_ultrasound'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'anemia': {
    correctDiagnosis: { code: 'D50.9', name: t('Железодефицитная анемия средней степени тяжести', 'Орташа дәрежелі темір тапшылығы анемиясы', 'Iron deficiency anemia, moderate'), required: true },
    differentials: [
      { code: 'D50.9', name: t('Железодефицитная анемия', 'Темір тапшылығы анемиясы', 'Iron deficiency anemia'), required: true },
      { code: 'D51.0', name: t('B12-дефицитная анемия', 'B12-тапшылықты анемия', 'Vitamin B12 deficiency anemia') },
      { code: 'D56.9', name: t('Талассемия малая', 'Талассемия', 'Thalassemia minor') },
      { code: 'D64.9', name: t('Анемия хронического заболевания', 'Созылмалы ауру анемиясы', 'Anemia of chronic disease') },
    ],
    examinations: [
      { id: 'sideropenic_signs', category: 'general', label: t('Осмотр кожи, ногтей и языка (Сидеропенический синдром)', 'Тері, тырнақ, тіл тексеру (Сидеропения белгілері)', 'Skin, nail, & mucosal sideropenic signs'), result: t('Бледность кожных покровов с восковидным оттенком, ломкость и ложкообразная вогнутость ногтей (койлонихии), сухость кожи, хейлит (заеды в углах рта).', 'Терінің ағаруы, тырнақтардың морт сынғыштығы (койлонихия), бұрыштардағы заедалар.', 'Pallor of skin & conjunctivae, brittle spoon-shaped nails (koilonychia), angular cheilitis.'), relevant: true },
      { id: 'cardiac_murmur', category: 'cardiovascular', label: t('Аускультация сердца', 'Жүректі аускультациялау', 'Cardiac auscultation'), result: t('Систолический дующий шум на верхушке и легочной артерии (анемический шум). ЧСС 94 в мин.', 'Верхушкада систолалық үрлеуіш шу (анемиялық шу).', 'Soft systolic blowing murmur at apex and pulmonary area (functional anemic murmur).'), relevant: true },
      { id: 'abdo_anemia', category: 'abdominal', label: t('Пальпация селезенки и печени', 'Көкбауыр мен бауырды пальпациялау', 'Spleen & liver palpation'), result: t('Селезенка и печень не увеличены, безболезненны при пальпации.', 'Көкбауыр мен бауыр үлкеймеген.', 'Spleen & liver not palpable, non-tender.'), relevant: true },
    ],
    investigations: [
      { id: 'cbc_indices', category: 'laboratory', name: t('ОАК с эритроцитарными индексами (MCV, MCH)', 'Эритроцитарлық индекстері бар ОАК', 'CBC with RBC indices (MCV, MCH)'), result: t('Гемоглобин: 82 г/л, Эритроциты: 3.4 х 10^12/л, Цветовой показатель: 0.72, MCV: 71 фл (Микроцитоз), MCH: 24 пг (Гипохромия).', 'Гемоглобин: 82 г/л, Түс көрсеткіші: 0.72, MCV: 71 фл (Микроцитоз), MCH: 24 пг (Гипохромия).', 'Hb: 82 g/L, RBC: 3.4 x 10^12/L, Color index: 0.72, MCV: 71 fL (Microcytosis), MCH: 24 pg (Hypochromia).'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'iron_panel', category: 'laboratory', name: t('Ферритин, Сывороточное железо, ОЖСС', 'Ферритин, сарысулық темір, ЖТБҚ', 'Ferritin, Serum Iron, TIBC'), result: t('Ферритин сыворотки: 8.4 мкг/л (Норма 15-120) — снижен!, Сывороточное железо: 6.2 мкмоль/л, ОЖСС: 84 мкмоль/л (повышена).', 'Ферритин: 8.4 мкг/л (Төмен!), Сарысулық темір: 6.2 мкмоль/л.', 'Serum Ferritin: 8.4 mcg/L (Severely depleted < 15), Serum Iron: 6.2 umol/L, TIBC: 84 umol/L (High).'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'fecal_occult_blood', category: 'laboratory', name: t('Анализ кала на скрытую кровь', 'Нәжісті жасырын қанға талдау', 'Fecal Occult Blood Test (FOBT)'), result: t('Тест отрицательный.', 'Тест теріс.', 'FOBT negative.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'reticulocytes', category: 'laboratory', name: t('Ретикулоциты крови', 'Қан ретикулоциттері', 'Reticulocyte count'), result: t('Ретикулоциты: 0.6% (Норма 0.5 - 1.5%).', 'Ретикулоциттер: 0.6%.', 'Reticulocyte count: 0.6% (Normal/low baseline).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Пероральная терапия препаратами двухвалентного/трехвалентного железа', 'Екі/үш валентті темір препараттарымен пероралы терапия', 'Oral elemental iron supplementation therapy'), t('Поиск и устранение источника хроногенной кровопотери (гинеколог / ФГДС / колоноскопия)', 'Созылмалы қан жоғалту көзін табу', 'Investigate chronic blood loss source (gynae review, EGD/colonoscopy)')],
      medications: [t('Сульфат железа / Железа гидроксид полимальтозат (Тотема / Сорбифер / Мальтофер) 100-200 мг элементарного железа в сутки', 'Сорбифер / Мальтофер 100-200 мг элементарлы темір/тәул', 'Ferrous sulfate / Iron polymaltose 100-200 mg elemental iron/day'), t('Аскорбиновая кислота (Витамин C) 250 мг для улучшения всасывания железа', 'Аскорбин қышқылы 250 мг', 'Ascorbic acid (Vitamin C) 250 mg to enhance oral iron absorption')],
      nonDrug: [t('Диета, богатая гемовым железом (красное мясо, печень), ограничить чай/кофе во время еды', 'Қызыл етке бай диета', 'Diet rich in heme iron (red meat), avoid tea/coffee near iron dosing')],
      disposition: t('Амбулаторное наблюдение у терапевта / гематолога', 'Терапевтте амбулаториялық бақылау', 'Outpatient hematology/GP management'),
      followUp: t('Контроль ретикулоцитов на 7-10 день ("ретикулоцитарный криз"), контроль ОАК через 1 месяц', '10-ші күні ретикулоциттерді бақылау, 1 айдан кейін ОАК', 'Reticulocyte count on day 7-10 ("reticulocyte response"), recheck CBC in 1 month'),
      redFlags: [t('Тяжелая анемия (Hb < 60 г/л) с признаками ишемии миокарда или сердечной недостаточности (требует гемотрансфузии)', 'Ауыр анемия (Hb < 60 г/л) — эритроцитарлы масса құю көрсеткіші', 'Severe anemia (Hb < 60 g/L) with hemodynamic instability or myocardial ischemia (requires PRBC transfusion)')],
    },
    expectedActions: ['sideropenia_exam', 'cbc_mcv_mch', 'ferritin_test', 'oral_iron_prescription'],
    dangerousActions: ['blood_transfusion_for_asymptomatic_moderate_anemia', 'prescribe_b12_without_testing'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'hypertension': {
    correctDiagnosis: { code: 'I10', name: t('Эссенциальная первично-артериальная гипертензия 2 степени', '2 дәрежелі эссенциалды артериялық гипертензия', 'Essential primary hypertension, Grade 2'), required: true },
    differentials: [
      { code: 'I10', name: t('Эссенциальная артериальная гипертензия', 'Эссенциалды артериялық гипертензия', 'Essential hypertension'), required: true },
      { code: 'I15.0', name: t('Реноваскулярная гипертензия', 'Реноваскулярлы гипертензия', 'Renovascular hypertension') },
      { code: 'E27.5', name: t('Феохромоцитома вторичная', 'Феохромоцитома', 'Pheochromocytoma secondary') },
      { code: 'N03', name: t('Хронический гломерулонефрит', 'Созылмалы гломерулонефрит', 'Chronic glomerulonephritis') },
    ],
    examinations: [
      { id: 'bp_measurement', category: 'cardiovascular', label: t('Офисное измерение АД (Двукратное на обеих руках)', 'Екі қолда да АД офистік өлшеу', 'Office BP measurement (Both arms)'), result: t('Среднее АД: 164/98 мм рт.ст. ЧСС: 78 в мин.', 'Орташа АД: 164/98 мм б.б. ЖҮС: 78 мин.', 'Average office BP: 164/98 mmHg. HR 78 bpm.'), relevant: true },
      { id: 'target_organ_damage', category: 'cardiovascular', label: t('Осмотр на органы-мишени', 'Нысана ағзаларды тексеру', 'Target organ damage screening'), result: t('Верхушечный толчок смещен влево на 1.5 см. Отеков нет.', 'Төбелік соққы солға 1.5 см ығысқан.', 'Apical impulse displaced 1.5 cm leftward. No edema.'), relevant: true },
      { id: 'fundoscopy_htn', category: 'neurological', label: t('Офтальмоскопия глазного дна', 'Көз түбі офтальмоскопиясы', 'Fundoscopy'), result: t('Сужение артериол, симптом Салюса-Гунна I-II (Гипертоническая ангиопатия).', 'Артериолалардың тарылуы, Салюс-Гунн белгісі.', 'Arteriolar narrowing, Salus-Gunn sign I-II (Hypertensive retinopathy).'), relevant: true },
    ],
    investigations: [
      { id: 'abpm', category: 'functional', name: t('Суточное мониторирование АД (СМАД)', 'АД тәуліктік мониторингі (СМАД)', '24-hour Ambulatory BP Monitoring (ABPM)'), result: t('Среднесуточное АД: 152/92 мм рт.ст., ночной профиль "Non-dipper" (недостаточное снижение ночью).', 'Тәуліктік орташа АД: 152/92 мм б.б.', '24-hour mean BP: 152/92 mmHg, "Non-dipper" nocturnal profile.'), cost: 4, delayMs: 2000, indicated: true },
      { id: 'ecg', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Признаки ГЛЖ (индекс Соколова-Лиона 36 мм).', 'Сол қарынша гипертрофиясы (Соколов-Лион индексі 36 мм).', 'Left ventricular hypertrophy (Sokolow-Lyon index 36 mm).'), cost: 2, delayMs: 0, indicated: true },
      { id: 'creatinine_egfr', category: 'laboratory', name: t('Креатинин, СКФ, Калий, Липидограмма', 'Креатинин, СКФ, Калий, Липидограмма', 'Creatinine, eGFR, Potassium, Lipids'), result: t('Креатинин: 88 мкмоль/л, СКФ: 82 мл/мин, Калий: 4.3 ммоль/л, ЛПНП: 3.8 ммоль/л.', 'Креатинин: 88 мкмоль/л, СКФ: 82 мл/мин.', 'Creatinine: 88 umol/L, eGFR: 82 mL/min, Potassium: 4.3 mmol/L, LDL-C: 3.8 mmol/L.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'urinalysis_htn', category: 'laboratory', name: t('Общий анализ мочи и микроальбуминурия', 'Зәр анализі', 'Urinalysis & Microalbuminuria'), result: t('Микроальбуминурия: 45 мг/сут (Поражение почек-мишеней).', 'Микроальбуминурия: 45 мг/тәул.', 'Microalbuminuria: 45 mg/day (Target organ microvascular change).'), cost: 2, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Двойная комбинация антигипертензивных препаратов в одной таблетке (Фиксированная комбинация)', 'Тіркелген комбинацияда екі гипотензивті препарат', 'Single-pill dual combination antihypertensive therapy')],
      medications: [t('иАПФ/РААС (Периндоприл 5 мг или Лизиноприл 10 мг) + Амлодипин 5 мг или Индапамид 1.5 мг', 'Периндоприл 5 мг + Амлодипин 5 мг', 'ACEi/ARB (Perindopril 5 mg or Lisinopril 10 mg) + Amlodipine 5 mg or Indapamide 1.5 mg')],
      nonDrug: [t('Ограничение поваренной соли < 5 г/сут, снизить вес, 150 мин аэробных тренировок в неделю', 'Тұзды < 5 г/тәул шектеу, салмақ түсіру', 'DASH diet, salt restriction < 5 g/day, 150 min exercise/week')],
      disposition: t('Амбулаторное наблюдение терапевта / кардиолога', 'Терапевтте амбулаториялық бақылау', 'Outpatient GP / cardiology management'),
      followUp: t('Оценка эффективности и целевого АД < 130/80 мм рт.ст. через 4 недели', '4 аптадан кейін мақсатты АД < 130/80 бағалау', 'Assess BP target < 130/80 mmHg in 4 weeks'),
      redFlags: [t('Гипертонический криз с острой энцефалопатией, острой болью в груди или нарушением зрения', 'Асқынған гипертониялық криз белгілері', 'Hypertensive emergency signs (acute organ damage, severe headache, vision change)')],
    },
    expectedActions: ['bp_both_arms', 'abpm_order', 'ecg_lvh_check', 'dual_fixed_combo_prescription'],
    dangerousActions: ['monotherapy_for_grade_2_hypertension', 'ignore_lifestyle_advice'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'dvt': {
    correctDiagnosis: { code: 'I80.2', name: t('Острый тромбоз глубоких вен левой нижней конечности (ТГВ)', 'Сол аяқтың терең веналарының жедел тромбозы (ТҒТ)', 'Acute deep vein thrombosis (DVT) of left lower extremity'), required: true },
    differentials: [
      { code: 'I80.2', name: t('Тромбоз глубоких вен', 'Терең веналар тромбозы', 'Deep vein thrombosis'), required: true },
      { code: 'A46', name: t('Рожистое воспаление голени', 'Тіркеулі тілме қабынуы', 'Erysipelas of leg') },
      { code: 'M66.0', name: t('Разрыв кисты Бейкера', 'Бейкер кистасының жарылуы', 'Ruptured Baker cyst') },
      { code: 'I83.9', name: t('Варикозная болезнь с флебитом', 'Варикозды ауру', 'Varicose veins with superficial phlebitis') },
    ],
    examinations: [
      { id: 'leg_asymmetry', category: 'cardiovascular', label: t('Измерение окружности и осмотр голеней', 'Балтыр айналымын өлшеу және тексеру', 'Calf circumference & leg inspection'), result: t('Окружность левой голени +4.0 см больше правой на 10 см ниже колена. Отек, цианотично-гиперемированная кожа.', 'Сол балтыр айналымы оң аяқтан +4.0 см артық. Ісіну, цианоз.', 'Left calf circumference +4.0 cm greater than right. Edema, mild cyanosis and warmth.'), relevant: true },
      { id: 'homans_sign', category: 'cardiovascular', label: t('Симптомы Хоманса и Мозеса', 'Хоманс және Мозес белгілері', 'Homans & Moses signs'), result: t('Резкая болезненность в икроножной мышце при тыльном сгибании стопы (Симптом Хоманса +).', 'Аяқ басын артқа бүккенде балтырда ауырсыну (Хоманс белгісі +).', 'Sharp calf pain on dorsiflexion of foot (Homans sign positive).'), relevant: true },
      { id: 'ausc_lungs_dvt', category: 'respiratory', label: t('Аускультация лёгких (Исключить ТЭЛА)', 'Өкпені аускультациялау', 'Lung auscultation'), result: t('Везикулярное дыхание над обеими лёгкими, хрипов и шума трения плевры нет. SpO2 98%.', 'Өкпеде везикулярлық тыныс, сырылдар жоқ. SpO2 98%.', 'Normal vesicular breath sounds, no rales or pleural friction rub. SpO2 98%.'), relevant: true },
    ],
    investigations: [
      { id: 'us_duplex_veins', category: 'imaging', name: t('УЗ дуплексное сканирование вен нижних конечностей', 'Төменгі аяқ-қол веналарының УЗ дуплексті сканирлеуі', 'Venous duplex ultrasound'), result: t('Несжимаемость и окклюзирующий тромб в левой подколенной и бедренной венах, отсутствие кровотока.', 'Сол тақым және сан веналарында окклюзиялайтын тромб, қан ағымының болмауы.', 'Incompressible left popliteal & femoral veins with occlusive thrombus, absence of flow.'), cost: 4, delayMs: 2000, indicated: true },
      { id: 'd_dimer', category: 'laboratory', name: t('D-димер крови', 'Қан D-димері', 'D-dimer assay'), result: t('D-димер: 2890 нг/мл (Норма < 500) — положительный.', 'D-димер: 2890 нг/мл — оң.', 'D-dimer: 2890 ng/mL — positive.'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'coagulation', category: 'laboratory', name: t('Коагулограмма (МНО, АЧТВ, Фибриноген)', 'Коагулограмма', 'Coagulation panel'), result: t('МНО: 1.05, АЧТВ: 30 сек, Фибриноген: 4.1 г/л.', 'ХҒҚ: 1.05, АЧТВ: 30 сек, Фибриноген: 4.1 г/л.', 'INR: 1.05, aPTT: 30 sec, Fibrinogen: 4.1 g/L.'), cost: 2, delayMs: 1000, indicated: true },
      { id: 'cbc_dvt', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Тромбоциты: 240 х 10^9/л, Лейкоциты: 7.8 х 10^9/л.', 'Тромбоциттер: 240 х 10^9/л.', 'Platelets: 240 x 10^9/L, WBC: 7.8 x 10^9/L.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Срочная антикоагулянтная терапия', 'Шұғыл антикоагулянттық терапия', 'Immediate therapeutic anticoagulation')],
      medications: [t('ПОАК (Ривароксабан 15 мг 2 раза/сут 21 день, затем 20 мг/сут) или Апиксабан 10 мг 2 раза/сут 7 дней', 'Ривароксабан 15 мг 2 рет/тәул 21 күн немесе Апиксабан 10 мг 2 рет/тәул 7 күн', 'DOAC (Rivaroxaban 15 mg BID for 21 days then 20 mg daily OR Apixaban 10 mg BID for 7 days then 5 mg BID)'), t('Эноксапарин 1 мг/кг 2 раза/сут с/к при выборе варфарина или парентерального старта', 'Эноксапарин 1 мг/кг 2 рет/тәул т/а', 'LMWH Enoxaparin 1 mg/kg SC BID if parenteral initial lead-in chosen')],
      nonDrug: [t('Компрессионный трикотаж 2 класса защиты после утихания острого болевого синдрома', '2 класты компрессиялық шұлық', 'Class 2 compression stockings after acute pain subsides')],
      disposition: t('Амбулаторная терапия при стабильном состоянии и высоком комплаенсе / Госпитализация при высоком риске ТЭЛА', 'Амбулаториялық немесе стационарлық емдеу', 'Outpatient DOAC therapy for low-risk stable DVT; admit if high PE risk'),
      followUp: t('УЗДГ вен через 3 месяца для оценки реканализации', '3 айдан кейін веналар УЗДГ бақылау', 'Repeat venous duplex ultrasound in 3 months'),
      redFlags: [t('Внезапная одышка, боль в груди (ТЭЛА!), синяя болевая флегмазия (Phlegmasia cerulea dolens)', 'Кенеттен ентігу, кеудедегі ауырсыну (ӨАТЭ белгілері!)', 'Sudden dyspnea or chest pain (PE!), limb-threatening Phlegmasia cerulea dolens')],
    },
    expectedActions: ['homans_sign_exam', 'venous_duplex_ultrasound', 'doac_anticoagulation_start'],
    dangerousActions: ['massage_affected_limb_risk_of_pe', 'discharge_without_anticoagulant'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  // EMERGENCY
  'anaphylaxis': {
    correctDiagnosis: { code: 'T78.2', name: t('Анафилактический шок на лекарственный препарат (Амоксициллин)', 'Дәрілік препаратқа анафилаксиялық шок', 'Anaphylactic shock secondary to amoxicillin'), required: true },
    differentials: [
      { code: 'T78.2', name: t('Анафилаксия / Анафилактический шок', 'Анафилаксия', 'Anaphylaxis / Anaphylactic shock'), required: true },
      { code: 'J45.901', name: t('Тяжёлое обострение бронхиальной астмы', 'Ауыр бронх демікпесі өршуі', 'Severe asthma attack') },
      { code: 'T17.5', name: t('Обструкция верхних дыхательных путей', 'Жоғарғы тыныс жолдарының обструкциясы', 'Upper airway obstruction') },
      { code: 'R57.9', name: t('Вазовагальный обморок', 'Вазовагальды талып қалу', 'Vasovagal syncope') },
    ],
    examinations: [
      { id: 'abc_airway', category: 'general', label: t('Оценка ABC (Проходимость дыхательных путей, дыхание, кровообращение)', 'ABC бағалау (Тыныс жолдары, тыныс алу, қан айналым)', 'ABC resuscitation evaluation (Airway, Breathing, Circulation)'), result: t('Отечность губ, языка и мягкого нёба. Стридор при вдохе, сухие свистящие хрипы. АД 82/48 мм рт.ст., ЧСС 132 в мин.', 'Ерін, тіл ісінуі. Стридор. АД 82/48 мм б.б., ЖҮС 132 мин.', 'Lip & tongue angioedema. Inspiratory stridor & wheezing. Severe hypotension BP 82/48 mmHg, HR 132 bpm.'), relevant: true },
      { id: 'skin_urticaria', category: 'general', label: t('Осмотр кожных покровов (Крапивница)', 'Теріні тексеру (Есекжем)', 'Skin urticaria & angioedema'), result: t('Распространенная зудящая крапивница (уртикарная сыпь) на туловище и конечностях.', 'Дене мен аяқ-қолда тараған қышитын есекжем.', 'Generalized pruritic urticarial rash & erythema over trunk and extremities.'), relevant: true },
      { id: 'pulses_perfusion', category: 'cardiovascular', label: t('Оценка пульсации и периферической перфузии', 'Пульсацияны және перфузияны бағалау', 'Peripheral pulse & perfusion'), result: t('Нитевидный слабый пульс на лучевых артериях, холодный липкий пот.', 'Жіп тәрізді әлсіз пульс, салқын жабысқақ тер.', 'Weak thready radial pulses, cold clammy skin.'), relevant: true },
    ],
    investigations: [
      { id: 'vital_monitoring', category: 'functional', name: t('Непрерывный мониторинг АД, ЧСС, SpO2 (Критический!)', 'АД, ЖҮС, SpO2 үздіксіз мониторингі', 'Continuous Vital Signs & SpO2 Monitoring'), result: t('АД 82/48 мм рт.ст., ЧСС 132 в мин, SpO2 86% на воздухе.', 'АД 82/48 мм б.б., ЖҮС 132 мин, SpO2 86%.', 'BP 82/48 mmHg, HR 132 bpm, SpO2 86% on room air.'), cost: 1, delayMs: 0, indicated: true },
      { id: 'abg', category: 'laboratory', name: t('Газы крови', 'Қан газдары', 'Arterial Blood Gas'), result: t('pH 7.30, PaO2 55 мм рт.ст. (Гипоксия и ацидоз).', 'pH 7.30, PaO2 55 мм б.б.', 'pH 7.30, PaO2 55 mmHg (Acute hypoxemia & metabolic acidosis).'), cost: 3, delayMs: 1000, indicated: true },
      { id: 'ecg_anaphylaxis', category: 'functional', name: t('ЭКГ в 12 отведениях', '12 тіркемедегі ЭКГ', '12-lead ECG'), result: t('Синусовая тахикардия 132 в мин, депрессия ST в II, III, aVF (гипоперфузия).', 'Синусты тахикардия 132 мин, ST депрессиясы.', 'Sinus tachycardia 132 bpm, non-specific ischemic ST changes.'), cost: 2, delayMs: 500, indicated: true },
      { id: 'cbc', category: 'laboratory', name: t('Общий анализ крови (Вторично)', 'Жалпы қан анализі', 'CBC (Secondary)'), result: t('Эозинофилы 6%, Гемоконцентрация (Гемоглобин 162 г/л).', 'Эозинофилдер 6%, Гемоглобин 162 г/л.', 'Eosinophils 6%, Hemoconcentration (Hb 162 g/L).'), cost: 1, delayMs: 1000, indicated: false },
    ],
    managementPlan: {
      recommendations: [t('ПЕРВАЯ ЛИНИЯ: Немедленное введение Адреналина (Эпинефрина) в/м!', 'БІРІНШІ ЖЕЛІ: Шұғыл б/і Адреналин енгізу!', 'FIRST LINE: Immediate Intramuscular Adrenaline (Epinephrine)!'), t('Прекратить введение аллергена, положить пациента на спину с приподнятыми ногами', 'Аллергенді тоқтату, аяқты көтеріп жатқызу', 'Stop offending agent, position supine with legs elevated'), t('Подача высокопоточного 100% кислорода через маску с резервуаром', 'Резервуары бар маска арқылы 100% оттек беру', 'High-flow 100% Oxygen via non-rebreather mask')],
      medications: [t('Адреналин (Эпинефрин) 0.1% — 0.5 мл в/м в среднюю треть передненаружной поверхности бедра! Повторить через 5-15 мин при отсутствии эффекта!', 'Адреналин 0.1% — 0.5 мл б/і санға енгізу! 5-15 минуттан кейін қайталау!', 'Adrenaline (Epinephrine) 1:1000 — 0.5 mg (0.5 mL) IM into anterolateral mid-thigh! Repeat Q5-15 min if needed!'), t('Инфузия 0.9% NaCl 1000-2000 мл в/в струйно для коррекции вазодилатации', '0.9% NaCl 1000-2000 мл т/і струйно инфузиясы', 'IV Crystalloid fluid bolus (0.9% Normal Saline 1-2 L rapidly)'), t('Вторичные препараты (после адреналина): ГКС (Дексаметазон 8-16 мг в/в) + Антигистаминные (Клемастин/Дифенгидрамин в/в)', 'Екіншілік: ГКС (Дексаметазон 8-16 мг т/і) + Антигистаминдік', 'Second-line (AFTER adrenaline): IV Corticosteroids (Dexamethasone 8-16 mg IV) + H1/H2 Blockers')],
      nonDrug: [t('Готовность к интубации трахеи или коникотомии при прогрессирующем отёке гортани!', 'Тамақ ісінуінде интубацияға/коникотомияға дайын болу!', 'Prepare for endotracheal intubation or cricothyroidotomy if airway compromised!')],
      disposition: t('Экстренная транспортировка в отделение реанимации и интенсивной терапии (ОРИТ)', 'ОРИТ-ке шұғыл транспортировкалау', 'Emergency admission to ICU / Resuscitation bay'),
      followUp: t('Наблюдение в ОРИТ минимум 12-24 часа из-за риска двухфазной (бифазной) анафилаксии', 'Бифазды анафилаксия қаупіне байланысты ОРИТ-те 12-24 сағат бақылау', 'Monitor in ICU for 12-24 hours due to biphasic anaphylaxis risk'),
      redFlags: [t('Прогрессирующий отёк дыхательных путей, некупируемый шок, остановка дыхания и кровообращения', 'Тыныс жолдарының ісінуі, тоқтатылмайтын шок', 'Airway obstruction, refractory shock, cardiac arrest')],
    },
    expectedActions: ['abc_airway_eval', 'im_adrenaline_first_line', 'high_flow_oxygen', 'iv_fluid_bolus', 'secondary_steroid_antihistamine'],
    dangerousActions: ['antihistamine_only_monotherapy_without_adrenaline', 'delay_adrenaline_for_steroids', 'upright_positioning'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'preeclampsia': {
    correctDiagnosis: { code: 'O14.1', name: t('Тяжёлая преэклампсия на 34 неделе беременности', '34 апталық жүктіліктегі ауыр преэклампсия', 'Severe preeclampsia at 34 weeks gestation'), required: true },
    differentials: [
      { code: 'O14.1', name: t('Тяжёлая преэклампсия', 'Ауыр преэклампсия', 'Severe preeclampsia'), required: true },
      { code: 'O15.0', name: t('Эклампсия (при возникновении судорог)', 'Эклампсия', 'Eclampsia') },
      { code: 'O13', name: t('Гестационная артериальная гипертензия', 'Гестациялық артериялық гипертензия', 'Gestational hypertension') },
      { code: 'O10', name: t('Хроническая артериальная гипертензия', 'Созылмалы артериялық гипертензия', 'Chronic hypertension in pregnancy') },
    ],
    examinations: [
      { id: 'bp_measurement', category: 'cardiovascular', label: t('Измерение АД у беременной (Двукратное)', 'Жүкті әйелде АД өлшеу', 'BP measurement in pregnancy'), result: t('АД: 174/112 мм рт.ст. (Тяжёлая артериальная гипертензия).', 'АД: 174/112 мм б.б. (Ауыр артериялық гипертензия).', 'BP: 174/112 mmHg (Severe hypertension in pregnancy).'), relevant: true },
      { id: 'reflexes_clonus', category: 'neurological', label: t('Проверка сухожильных рефлексов и клонуса стоп', 'Сіңір рефлекстерін және аяқ клонусын тексеру', 'Patellar reflexes & ankle clonus'), result: t('Сухожильные рефлексы с колен резко гиперрефлекторны (4+), положительный клонус стоп (3-4 толчка).', 'Тізе сіңір рефлекстері жоғары, аяқ клонусы оң.', 'Hyperreflexia (4+), positive ankle clonus (3-4 beats). Sign of neuromuscular irritability.'), relevant: true },
      { id: 'edema_general', category: 'general', label: t('Оценка отёков голеней, кистей и лица', 'Балтыр, қол және бет ісінуін бағалау', 'General edema assessment'), result: t('Выраженные плотные отёки голеней (3+), отёчность пальцев рук и лица.', 'Балтырлардың (3+), қол саусақтары мен беттің айқын ісінуі.', 'Pitting edema (3+) of lower extremities, facial & hand puffiness.'), relevant: true },
    ],
    investigations: [
      { id: 'proteinuria', category: 'laboratory', name: t('Суточная протеинурия / Тест-полоска на белок', 'Тәуліктік протеинурия', '24-hour Urine Protein / Dipstick'), result: t('Белок в моче: 3.5 г/л (Экспресс-полоска 3+). Тяжёлая протеинурия.', 'Зәрдегі ақуыз: 3.5 г/л (3+). Ауыр протеинурия.', 'Urine protein: 3.5 g/L (3+ dipstick). Severe proteinuria.'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'platelets_lft', category: 'laboratory', name: t('Тромбоциты, АЛТ, АСТ, Урат, Креатинин (Исключить HELLP)', 'Тромбоциттер, АЛТ, АСТ (HELLP жоққа шығару)', 'Platelets, LFTs, Urate, Creatinine (HELLP screen)'), result: t('Тромбоциты: 110 х 10^9/л, АЛТ: 72 ЕД/л, АСТ: 64 ЕД/л, Мочевая кислота: 480 мкмоль/л.', 'Тромбоциттер: 110 х 10^9/л, АЛТ: 72 ЕД/л, АСТ: 64 ЕД/л.', 'Platelets: 110 x 10^9/L, ALT: 72 U/L, AST: 64 U/L, Urate: 480 umol/L.'), cost: 2, delayMs: 1500, indicated: true },
      { id: 'fetal_ctg', category: 'functional', name: t('КТГ плода (Кардиотокография)', 'Ұрық КТГ-сы', 'Fetal Cardiotocography (CTG)'), result: t('Базальная ЧСС плода 140 в мин, вариабельность сохранена, децелераций нет.', 'Ұрықтың базальды ЖҮС 140 мин, децелерациялар жоқ.', 'Fetal baseline HR 140 bpm, moderate variability, no decelerations.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_preeclampsia', category: 'laboratory', name: t('Общий анализ крови (Гематокрит)', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Гемоглобин: 138 г/л, Гематокрит: 42% (Гемоконцентрация при преэклампсии).', 'Гемоглобин: 138 г/л, Гематокрит: 42%.', 'Hb: 138 g/L, Hematocrit: 42% (Hemoconcentration).'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Экстренная госпитализация в акушерский стационар 3-го уровня', '3-ші деңгейлі акушерлік стационарға шұғыл госпитализациялау', 'Immediate admission to tertiary obstetric center'), t('Профилактика судорог (Эклампсии) Магния сульфатом!', 'Магний сульфатымен судороганың алдын алу!', 'Eclampsia prophylaxis with Magnesium Sulfate!')],
      medications: [t('Магния сульфат: болюс 4 г в/в медленно за 10-15 мин, затем поддержка 1-2 г/час в/в инфузоматом', 'Магний сульфаты: 4 г т/і болюс, кейін 1-2 г/сағ инфузия', 'Magnesium Sulfate 4 g IV loading dose over 10-15 min, followed by 1-2 g/hr IV infusion'), t('Гипотензивная терапия при АД >= 160/110 мм рт.ст. (Лабеталол в/в или Нифедипин 10 мг внутрь)', 'АД >= 160/110 мм б.б. болғанда гипотензивті терапия (Лабеталол немесе Нифедипин 10 мг)', 'Antihypertensive therapy (Labetalol IV or Nifedipine 10 mg oral) for SBP >= 160 or DBP >= 110'), t('Профилактика РДС плода (Дексаметазон 6 мг в/м каждые 12 ч — 4 дозы)', 'Ұрықтың РДС алдын алу (Дексаметазон 6 мг б/і)', 'Antenatal corticosteroids (Dexamethasone 6 mg IM Q12H x 4 doses) for lung maturity')],
      nonDrug: [t('Охранительный режим, мониторинг глубоких сухожильных рефлексов и дыхания (контроль токсичности магния)', 'Төсек режимі, магний токсикалығын бақылау', 'Strict bed rest, monitor knee reflexes & respiratory rate (Mg toxicity check)')],
      disposition: t('Госпитализация в отделение реанимации акушерского стационара', 'Перинаталдық орталықтың реанимация бөлімшесіне госпитализациялау', 'Admission to Obstetric ICU'),
      followUp: t('Родоразрешение после стабилизации состояния матери', 'Анасының жағдайы тұрақтанғаннан кейін босандыру', 'Delivery planning following maternal stabilization'),
      redFlags: [t('Развитие судорог эклампсии, HELLP-синдром, отслойка нормально расположенной плаценты, анурия', 'Эклампсия тырысулары, HELLP-синдром, плацентаның ажырауы', 'Eclamptic convulsions, HELLP syndrome, placental abruption, acute renal failure')],
    },
    expectedActions: ['bp_pregnancy_check', 'proteinuria_test', 'magnesium_sulfate_prophylaxis', 'antihypertensive_nifedipine_or_labetalol'],
    dangerousActions: ['give_ace_inhibitors_contraindicated_in_pregnancy', 'delay_magnesium_sulfate'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'renal-colic': {
    correctDiagnosis: { code: 'N20.1', name: t('Почечная колика справа. Камень правого мочеточника', 'Оң жақ бүйрек коликасы. Оң несепағар тасы', 'Right renal colic. Right ureteral calculus'), required: true },
    differentials: [
      { code: 'N20.1', name: t('Почечная колика / Камень мочеточника', 'Бүйрек коликасы', 'Renal colic / Ureteral stone'), required: true },
      { code: 'K35.8', name: t('Острый аппендицит', 'Жедел аппендицит', 'Acute appendicitis') },
      { code: 'N10', name: t('Острый пиелонефрит', 'Жедел пиелонефрит', 'Acute pyelonephritis') },
      { code: 'I71.4', name: t('Аневризма брюшной аорты (расслоение)', 'Іш аортасының аневризмасы', 'Abdominal aortic aneurysm rupture') },
    ],
    examinations: [
      { id: 'pasternatsky_flank', category: 'abdominal', label: t('Осмотр и поколачивание по пояснице', 'Бел аймағын қағу', 'Costovertebral angle tenderness'), result: t('Пациент метается от боли, не может найти удобное положение. Резко положительный симптом Пастернацкого справа.', 'Науқас ауырсынудан мазасызданады. Оң жақта Пастернацкий белгісі шұғыл оң.', 'Patient writhing in pain, unable to lie still. Sharp right-sided costovertebral angle tenderness.'), relevant: true },
      { id: 'abdomen_palpation', category: 'abdominal', label: t('Пальпация живота', 'Ішті пальпациялау', 'Abdominal palpation'), result: t('Живот мягкий, безболезненный во всех отделах. Симптомов раздражения брюшины нет.', 'Іші жұмсақ, ауырсынусыз. Щеткин-Блюмберг теріс.', 'Abdomen soft, non-tender in all quadrants. No peritoneal signs.'), relevant: true },
      { id: 'vitals_colic', category: 'cardiovascular', label: t('Измерение АД, ЧСС и температуры', 'АД, ЖҮС және температураны өлшеу', 'Vital signs measurement'), result: t('АД 142/88 мм рт.ст., ЧСС 98 в мин, Температура 36.8°C (Афебрильная).', 'АД 142/88 мм б.б., ЖҮС 98 мин, Температура 36.8°C.', 'BP 142/88 mmHg, HR 98 bpm, Temp 36.8°C (Afebrile).'), relevant: true },
    ],
    investigations: [
      { id: 'urinalysis_microhematuria', category: 'laboratory', name: t('Общий анализ мочи (ОАМ)', 'Жалпы зәр анализі', 'Urinalysis'), result: t('Микрогематурия (Эритроциты покрывают 1/2 п/з), Лейкоциты: 1-2 в п/з, Соли оксалаты (++++).', 'Микрогематурия (Эритроциттер 1/2 к/ө), Лейкоциттер: 1-2 к/ө, Оксалаттар (++++).', 'Microhematuria (RBCs covering 1/2 field), WBC 1-2/hpf, Calcium oxalate crystals (++++).'), cost: 1, delayMs: 1000, indicated: true },
      { id: 'ct_kud_noncontrast', category: 'imaging', name: t('Низкодозная КТ почек и мочевыводящих путей без контраста (Золотой стандарт!)', 'Контрастсыз почек пен зәр жолдарының КТ-сы', 'Non-contrast Low-dose CT KUB (Gold standard)'), result: t('В нижней третьи правого мочеточника визуализируется конкремент 5 мм, плотностью 850 HU. Каликоэктазия и пиелоэктазия справа.', 'Оң несепағардың төменгі үштен бірінде 5 мм конкремент (тығыздығы 850 HU).', 'Non-contrast CT KUB reveals 5 mm hyperdense calculus (850 HU) in right distal ureter with mild proximal hydroureteronephrosis.'), cost: 6, delayMs: 2500, indicated: true },
      { id: 'us_kidneys', category: 'imaging', name: t('УЗИ почек и мочевого пузыря', 'Бүйрек пен зәр қабының УЗИ-і', 'Renal ultrasound'), result: t('Расширение чашечно-лоханочной системы правой почки (лоханка 22 мм). Камень в устье мочеточника лоцируется с трудом.', 'Оң бүйректің ЧЛС кеңеюі (астауша 22 мм).', 'Moderate right hydronephrosis (renal pelvis 22 mm). Acoustic shadowing calculus near UVJ.'), cost: 3, delayMs: 1500, indicated: true },
      { id: 'cbc_colic', category: 'laboratory', name: t('Общий анализ крови', 'Жалпы қан анализі', 'Complete Blood Count'), result: t('Лейкоциты: 8.9 х 10^9/л, Гемоглобин: 142 г/л.', 'Лейкоциттер: 8.9 х 10^9/л.', 'WBC: 8.9 x 10^9/L, Hb: 142 g/L.'), cost: 1, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('Немедленное купирование болевого синдрома (Купирование колики)', 'Ауырсыну синдромын шұғыл тоқтату', 'Immediate pain relief')],
      medications: [t('НПВП первая линия (Кеторолак 30 мг в/в или Декскетопрофен 50 мг в/в)', 'НПВП бирінші желі (Кеторолак 30 мг т/і немесе Декскетопрофен 50 мг т/і)', 'First line: IV NSAIDs (Ketorolac 30 mg IV or Dexketoprofen 50 mg IV)'), t('Альфа-1-адреноблокаторы (Тамсулозин 0.4 мг 1 раз/сут) для камнеизгоняющей терапии', 'Тамсулозин 0.4 мг 1 рет/тәул', 'Alpha-blockers (Tamsulosin 0.4 mg daily) for medical expulsive therapy'), t('Спазмолитики (Дротаверин / Платифиллин) при необходимости', 'Спазмолитиктер', 'Spasmolytics (Drotaverine IV)')],
      nonDrug: [t('Тепловые процедуры при отсутствии инфекции, водная нагрузка после купирования боли', 'Ауырсыну тоқтағаннан кейін су жүктемесі', 'Warm bath/compress if non-febrile, fluid intake after acute colic subsides')],
      disposition: t('Амбулаторное лечение при размере камня < 6 мм и отсутствии инфекции / Госпитализация в урологию при анурии или фебрильной лихорадке', 'Амбулаториялық немесе урологияға госпитализациялау', 'Outpatient management for stones < 6 mm; admit if infected hydronephrosis or refractory pain'),
      followUp: t('Контроль отхождения камня и УЗИ через 7-14 дней', '7-14 күннен кейін тас түсуін және УЗИ бақылау', 'Sieve urine for stone capture; follow-up ultrasound in 1-2 weeks'),
      redFlags: [t('Обструктивный пиелонефрит (сочетание колы с лихорадкой > 38°C и ознобом — требуется экстренное дренирование / стентирование!), анурия', 'Олигоанурия, қызбаның қосылуы (шұғыл стенттеу көрсеткіші!)', 'Infected obstructed kidney (fever > 38°C + colic requires EMERGENCY ureteral stenting/nephrostomy!)')],
    },
    expectedActions: ['pasternatsky_exam', 'urinalysis_microhematuria', 'noncontrast_ct_kub', 'iv_nsaid_ketorolac'],
    dangerousActions: ['water_load_during_active_acute_obstruction', 'overlook_fever_and_infection'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },

  'status-epilepticus': {
    correctDiagnosis: { code: 'G40.9', name: t('Эпилептический статус генерализованных судорожных приступов', 'Генерализацияланған тырысу ұстамаларының эпилептикалық статусы', 'Generalized convulsive status epilepticus'), required: true },
    differentials: [
      { code: 'G40.9', name: t('Эпилептический статус', 'Эпилептикалық статус', 'Status epilepticus'), required: true },
      { code: 'E16.2', name: t('Гипогликемическая кома с судорогами', 'Судорогасы бар гипогликемиялық кома', 'Hypoglycemic seizure/coma') },
      { code: 'G00.9', name: t('Бактериальный менингит', 'Бактериялық менингит', 'Bacterial meningitis') },
      { code: 'T51.0', name: t('Острая интоксикация / синдром отмены', 'Улану / алып тастау синдромы', 'Acute toxicity / Alcohol withdrawal') },
    ],
    examinations: [
      { id: 'seizure_activity', category: 'neurological', label: t('Оценка судорожной активности и времени приступа', 'Тырысу белсенділігін және ұстама уақытын бағалау', 'Seizure activity & duration evaluation'), result: t('Непрерывные генерализованные тонико-клонические судороги продолжаются > 5 минут (или 2 приступа без восстановления сознания).', 'Үздіксіз генерализацияланған тонико-клоникалық тырысулар > 5 минут созылуда.', 'Continuous generalized tonic-clonic motor seizure activity > 5 minutes without recovery of consciousness.'), relevant: true },
      { id: 'airway_patency', category: 'respiratory', label: t('Оценка проходимости дыхательных путей и SpO2', 'Тырысу кезінде тыныс жолдарын бағалау', 'Airway & SpO2 evaluation'), result: t('Западание языка, прикусывание языка, обильное пенистое отделяемое изо рта. SpO2 84%.', 'Тілдің қайырылуы, ауыздан көпіршікті бөліністер. SpO2 84%.', 'Airway obstruction risk, tongue biting, foaming at mouth. SpO2 84%.'), relevant: true },
      { id: 'pupillary_reflexes', category: 'neurological', label: t('Оценка зрачков и фотореакции', 'Қарашықтарды тексеру', 'Pupillary size & light response'), result: t('Зрачки D=S=4 мм, реакция на свет вялая, двусторонний симптом Бабинского (+).', 'Қарашықтар D=S=4 мм, жарыққа реакциясы баяу, Бабинский белгісі (+).', 'Pupils symmetric 4 mm, sluggish light reflex, bilateral Babinski sign.'), relevant: true },
    ],
    investigations: [
      { id: 'bedside_glucose', category: 'laboratory', name: t('Экспресс-глюкометрия (Критическое исключение!)', 'Экспресс-глюкометрия', 'Bedside blood glucose (Critical rule out!)'), result: t('Глюкоза крови: 5.4 ммоль/л (Гипогликемия исключена).', 'Қан глюкозасы: 5.4 ммоль/л (Гипогликемия жоққа шығарылды).', 'Blood glucose: 5.4 mmol/L (Hypoglycemia ruled out).'), cost: 1, delayMs: 0, indicated: true },
      { id: 'eeg_urgency', category: 'functional', name: t('Экстренная ЭЭГ', 'Шұғыл ЭЭГ', 'Emergency EEG'), result: t('Непрерывная генерализованная спайк-волновая эпилептиформная активность 4-5 Гц.', 'Үздіксіз генерализацияланған спайк-толқынды эпилептиформды белсенділік.', 'Continuous generalized high-voltage spike-and-wave epileptiform discharges.'), cost: 4, delayMs: 2000, indicated: true },
      { id: 'ct_head', category: 'imaging', name: t('КТ головного мозга после купирования судорог', 'КТ бас миы', 'Head CT post-stabilization'), result: t('Объёмных образований и свежего кровоизлияния не выявлено.', 'Көлемді түзілістер мен қан құйылу табылған жоқ.', 'No acute intracranial hemorrhage or mass lesion.'), cost: 6, delayMs: 3000, indicated: true },
      { id: 'abg_status', category: 'laboratory', name: t('Газы артериальной крови и электролиты', 'Артериялық қан газдары', 'Arterial Blood Gas & Electrolytes'), result: t('pH 7.24, PaO2 68 мм рт.ст., PaCO2 52 мм рт.ст., Натрий 137 ммоль/л, Калий 4.2 ммоль/л (Комбинированный ацидоз).', 'pH 7.24, PaO2 68 мм б.б., PaCO2 52 мм б.б.', 'pH 7.24, PaO2 68 mmHg, PaCO2 52 mmHg (Mixed respiratory-metabolic acidosis).'), cost: 3, delayMs: 1000, indicated: true },
    ],
    managementPlan: {
      recommendations: [t('ПЕРВАЯ ЛИНИЯ (0-5 мин): Обеспечение проходимости ДП, оксигенотерапия, введение Бензодиазепинов!', 'БІРІНШІ ЖЕЛІ: Бензодиазепиндер енгізу!', 'FIRST LINE (0-5 min): Airway, high-flow O2, immediate IV/IM Benzodiazepines!'), t('ВТОРАЯ ЛИНИЯ (10-20 мин): Внутривенные антиконвульсанты (Вальпроат натрия или Леветирацетам)', 'ЕКІНШІ ЖЕЛІ: Тамыр ішілік антиконвульсанттар', 'SECOND LINE (10-20 min): IV Antiepileptic drugs (Valproate sodium or Levetiracetam)')],
      medications: [t('Диазепам 10 мг в/в медленно (или Мидазолам 10 мг в/м). При отсутствии ответа — повторить через 5 минут!', 'Диазепам 10 мг т/і баяу (немесе Мидазолам 10 мг б/і). 5 минуттан кейін қайталау!', 'Diazepam 10 mg IV slow push (or Midazolam 10 mg IM). Repeat once after 5 min if seizure persists!'), t('Вальпроат натрия 25-30 мг/кг в/в болюс (за 5-10 мин) или Леветирацетам 60 мг/кг (до 4500 мг в/в)', 'Вальпроат натрий 25-30 мг/кг т/і немесе Леветирацетам 60 мг/кг т/і', 'Valproate sodium 25-30 mg/kg IV bolus OR Levetiracetam 60 mg/kg IV infusion'), t('Пропофол или Тиопентал натрия в/в при рефрактерном статусе (> 30 мин) с переводом на ИВЛ', 'Рефрактерлі статус кезінде Пропофол т/і + ИВЛ', 'Propofol infusion + Endotracheal intubation if refractory status (> 30 min)')],
      nonDrug: [t('Повернуть пациента на бок, защитить голову от травм, не вставлять предметы в рот!', 'Науқасты қырынан жатқызу, ауызға зат тықпау!', 'Place patient in recovery position, protect head, DO NOT force objects into mouth!')],
      disposition: t('Экстренная госпитализация в отделение реанимации и интенсивной терапии (ОРИТ)', 'ОРИТ-ке шұғыл госпитализациялау', 'Immediate resuscitation bay / ICU admission'),
      followUp: t('Неврологический мониторинг, подбор постоянной антиконвульсивной терапии', 'Неврологиялық мониторинг, тұрақты антиконвульсивті терапия таңдау', 'Neurology consult, long-term antiepileptic optimization'),
      redFlags: [t('Рефрактерный эпилептический статус, аноксическая энцефалопатия, остановка дыхания', 'Рефрактерлі эпилептикалық статус, тыныс алудың тоқтауы', 'Refractory status epilepticus, respiratory arrest, severe cerebral hypoxia')],
    },
    expectedActions: ['airway_oxygen_safety', 'bedside_glucose_exclude_hypo', 'first_line_benzodiazepine', 'second_line_iv_valproate_or_levetiracetam'],
    dangerousActions: ['force_objects_into_mouth_during_convulsions', 'delay_benzodiazepines', 'discharge_after_seizure'],
    scoringRubric: { history: 20, examination: 15, investigations: 20, differential: 15, diagnosis: 10, management: 10, communication: 5, critical: 5 },
  },
};
`;

const filePath = path.join(process.cwd(), 'src', 'data', 'case-definitions.server.ts');
fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
console.log('Successfully wrote case-definitions.server.ts');
