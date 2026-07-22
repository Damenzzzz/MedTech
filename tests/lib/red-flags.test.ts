import { describe, expect, it } from 'vitest';
import { hasEmergencyRedFlags, hasPatientEmergencyRedFlags } from '@/lib/clinical/red-flags';

describe('hasEmergencyRedFlags (clinician phrasing)', () => {
  it.each([
    'Мужчина 55 лет, давящая боль за грудиной 40 минут, холодный пот',
    'Выраженная одышка, SpO2 90%',
    'Беременная 34 недели, головная боль, мушки перед глазами, повышены АЛТ',
  ])('flags %s', (scenario) => {
    expect(hasEmergencyRedFlags(scenario)).toBe(true);
  });

  it('does not flag a routine complaint', () => {
    expect(hasEmergencyRedFlags('Плановый осмотр, жалоб нет, АД 120/80')).toBe(false);
  });
});

describe('hasPatientEmergencyRedFlags (lay phrasing)', () => {
  it.each([
    'Не могу дышать, очень страшно',
    'Давит в груди и отдаёт в руку',
    'Была рвота с кровью',
    'Потерял сознание сегодня утром',
    'У ребёнка судороги',
    'Отёк языка после укола',
  ])('flags %s', (text) => {
    expect(hasPatientEmergencyRedFlags(text)).toBe(true);
  });

  it('still catches clinical phrasing pasted from a discharge summary', () => {
    expect(hasPatientEmergencyRedFlags('В выписке указано: SpO2 91%, одышка')).toBe(true);
  });

  it('does not flag an ordinary complaint', () => {
    expect(
      hasPatientEmergencyRedFlags('Третий день болит голова во второй половине дня, к вечеру усиливается'),
    ).toBe(false);
  });
});
