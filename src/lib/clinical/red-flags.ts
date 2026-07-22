/**
 * Cheap pre-LLM triage. Deliberately over-triages: a false "emergency" costs a
 * needless 103 prompt, a missed one costs far more. Never used to rule anything
 * out — only to skip the slow RAG round trip when someone must call now.
 */

/** Clinical phrasing, as typed by a doctor or nurse. */
const CLINICIAN_RED_FLAGS =
  /боль за грудин|давящ.{0,40}грудин|холодн.{0,16}пот|иррадиац|одышк|SpO2\s*(8|9[0-2])|АД\s*8\d|потер.{0,16}созн|судорог|кровотеч|анафилак|инсульт|170\/110|беремен.{0,80}(голов|мушк|подреб|тромбоцит|алт|аст)/i;

/**
 * Lay phrasing, as typed by a patient — plus every clinician pattern, since a
 * patient may well paste a discharge summary.
 */
const PATIENT_RED_FLAGS =
  /не могу дышать|тяжело дыш|задыха|давит в груди|сжимает груд|боль в груди|сильная боль в живот|рвота с кровью|кровь в стуле|ч[её]рный стул|сильное кровотеч|не останавливается кровь|потерял.{0,3} сознание|теряю сознание|обморок|судорог|перекос(ило)? лиц|не могу говорить|отнял(ась|ись|ся)|онемела рука|онемение половин|температура\s*(39|40|41)|от[её]к язык|от[её]к горл|анафилак|аллергическ.{0,20}от[её]к|суицид|не хочу жить|покончить с собой/i;

export function hasEmergencyRedFlags(text: string): boolean {
  return CLINICIAN_RED_FLAGS.test(text);
}

export function hasPatientEmergencyRedFlags(text: string): boolean {
  return PATIENT_RED_FLAGS.test(text) || CLINICIAN_RED_FLAGS.test(text);
}
