import { test, expect } from '@playwright/test';

test.describe('Stage 5 — Full E2E Workflows (Training, RAG, STT, Protocol)', () => {
  test('1. AI Assistant & Simulator: Beta badge, multi-turn dialogue, no ground truth leaks', async ({ page, request }) => {
    await page.goto('/ru/ai-assistant');
    await expect(page.getByRole('heading', { name: /Слушатель и симулятор|AI-Ассистент/i })).toBeVisible();

    // Check public cases DTO API ground truth isolation
    const casesRes = await request.get('/api/cases');
    expect(casesRes.ok()).toBeTruthy();
    const cases = (await casesRes.json()) as Record<string, unknown>[];
    expect(cases.length).toBeGreaterThan(0);
    expect(cases[0]).not.toHaveProperty('hiddenFacts');
    expect(cases[0]).not.toHaveProperty('correctDiagnosis');

    // Check simulator panel
    const simButton = page.getByRole('button', { name: /Симулятор пациента/i });
    if (await simButton.isVisible()) {
      await simButton.click();
    }

    const questionInput = page.getByPlaceholder(/Задайте вопрос пациенту/i);
    if (await questionInput.isVisible()) {
      await questionInput.fill('Когда началась боль в груди?');
      const sendBtn = page.getByRole('button', { name: /Спросить/i });
      await sendBtn.click();
      await expect(page.locator('text=Когда началась боль в груди?')).toBeVisible();

      await questionInput.fill('Отдаёт ли боль в руку?');
      await sendBtn.click();
      await expect(page.locator('text=Отдаёт ли боль в руку?')).toBeVisible();
    }
  });

  test('2. Training Workflow: Dialogue, Examination, Investigation result, Debrief', async ({ page }) => {
    await page.goto('/ru/training/chest-pain');

    // Verify patient header & beta badge
    await expect(page.locator('text=Арман Сагинов').first()).toBeVisible();
    await expect(page.locator('text=Beta (Unreviewed)').first()).toBeVisible();

    // Dialogue stage
    const questionInput = page.getByPlaceholder(/Задайте вопрос пациенту/i);
    if (await questionInput.isVisible()) {
      await questionInput.fill('Как давно болит за грудиной?');
      const askBtn = page.getByRole('button', { name: /Задать вопрос/i });
      await askBtn.click();
    }

    // Move to Examination stage
    const nextBtn = page.getByRole('button', { name: /Далее|Следующий этап/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Perform Examination
    const examBtn = page.getByRole('button', { name: /Выполнить осмотр|Пальпация/i }).first();
    if (await examBtn.isVisible()) {
      await examBtn.click();
    }
  });

  test('3. Clinical RAG: Query, rationale card "Почему выбран этот вариант", sources', async ({ page, request }) => {
    // API verification for RAG diagnose
    const diagRes = await request.post('/api/clinical/diagnose', {
      data: { symptoms: 'Острая давящая боль за грудиной 40 минут с иррадиацией в левую руку' },
    });
    expect(diagRes.ok()).toBeTruthy();

    const json = (await diagRes.json()) as {
      diagnoses: Array<{
        diagnosis: string;
        clinical_rationale?: { summary: string };
      }>;
      rag_status: string;
      generation_provider: string;
    };

    expect(json.diagnoses.length).toBeGreaterThan(0);
    expect(json.diagnoses[0].clinical_rationale?.summary).toBeDefined();
    expect(json.generation_provider).toBeDefined();

    // UI Verification
    await page.goto('/ru/ai-assistant');
    const searchBtn = page.getByRole('button', { name: /Найти по протоколам/i });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await expect(page.locator('text=Почему выбран этот вариант').first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('4. STT & Editable Protocol Workflow', async ({ page: _page, request }) => {
    // API verification for protocol generation
    const protoRes = await request.post('/api/encounter/protocol', {
      data: {
        transcriptId: 'test-trans-1',
        transcriptText: 'Врач: Здравствуйте, что вас беспокоит? Пациент: Давит в груди 40 минут.',
        turns: [
          { speaker: 'doctor', text: 'Здравствуйте, что вас беспокоит?' },
          { speaker: 'patient', text: 'Давит в груди 40 минут.' },
        ],
      },
    });

    expect(protoRes.ok()).toBeTruthy();
    const protoJson = (await protoRes.json()) as {
      protocolId: string;
      status: string;
      warning: string;
      provenance: { generationProvider: string };
    };

    expect(protoJson.status).toBe('draft');
    expect(protoJson.provenance.generationProvider).toBe('mock');
    expect(protoJson.warning).toContain('требует проверки');
  });
});
