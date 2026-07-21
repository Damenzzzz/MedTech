import { test, expect } from '@playwright/test';

test('landing opens patient queue and API does not leak ground truth', async ({ page, request }) => {
  await page.goto('/ru');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Find link to /patients
  const patientsLink = page.locator('a[href*="/patients"]').first();
  await patientsLink.click();

  await expect(page).toHaveURL(/\/ru\/patients/);

  // Check public API ground truth protection
  const response = await request.get('/api/cases');
  expect(response.ok()).toBeTruthy();
  const cases = (await response.json()) as Record<string, unknown>[];
  expect(cases.length).toBeGreaterThanOrEqual(32);
  expect(cases[0]).not.toHaveProperty('hiddenFacts');
  expect(cases[0]).not.toHaveProperty('correctDiagnosis');
  expect(cases[0]).not.toHaveProperty('scoringRubric');
});

test('training question input keeps focus while typing', async ({ page }) => {
  await page.goto('/ru/training/viral-uri');
  const input = page.getByPlaceholder(/Задайте вопрос|вопрос/i);
  if (await input.isVisible()) {
    await input.click();
    await input.pressSequentially('головная боль');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('головная боль');
  }
});
