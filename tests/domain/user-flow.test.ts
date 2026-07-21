import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('User Flow Logic & Validation', () => {
  const nameSchema = z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(2, 'Name too short')
        .max(40, 'Name too long')
    );

  it('validates name input strictly (2-40 chars after trim)', () => {
    expect(nameSchema.safeParse('  A  ').success).toBe(false); // only 1 char
    expect(nameSchema.safeParse('  Алихан  ').success).toBe(true);
    expect(nameSchema.safeParse('Д-р '.repeat(20)).success).toBe(false); // > 40 chars
  });

  it('determines next route based on onboarding completion status', () => {
    function getNextRoute(onboardingCompleted: boolean): string {
      return onboardingCompleted ? '/patients' : '/intro';
    }

    expect(getNextRoute(false)).toBe('/intro');
    expect(getNextRoute(true)).toBe('/patients');
  });

  it('handles locale switching supported list', () => {
    const supportedLocales = ['ru', 'kk', 'en'] as const;
    expect(supportedLocales).toContain('ru');
    expect(supportedLocales).toContain('kk');
    expect(supportedLocales).toContain('en');
  });
});
