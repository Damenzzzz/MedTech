import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Localization & Cyrillic Text Inspection', () => {
  function getAllTsxFiles(dirPath: string): string[] {
    let files: string[] = [];
    if (!fs.existsSync(dirPath)) return files;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllTsxFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const ALLOWED_ABBREVIATIONS = new Set([
    'МКБ',
    'ЭКГ',
    'ОАК',
    'АД',
    'БИТ',
    'SpO2',
    'GCS',
    'ГЭРБ',
    'ТЭЛА',
    'ОРВИ',
    'КТ',
    'ФАП',
    'УЗИ',
    'МРТ',
    'ЧСС',
    'ЧДД',
    'ЛЖ',
    'КАГ',
    'ОРИТ',
    'НПВС',
    'ЖҮС',
    'ҚҚБП',
    'РК',
    'МЗ',
    'мм',
    'рт',
    'ст',
    'уд',
    'мин',
  ]);

  const ALLOWED_DEV_FILES = new Set([
    'builder-view.tsx',
    'theme-provider.tsx',
    'stt-encounter-workspace.tsx',
    'voice-stt-panel.tsx',
    'patient-stage.tsx',
    'patient-grid.tsx',
    'simulator-panel.tsx',
    'clinical-query-form.tsx',
    'differential-results.tsx',
    'clinical-ai-workspace.tsx',
    'clarification-panel.tsx',
  ]);

  it('scans UI components for hardcoded un-localized Cyrillic text nodes', () => {
    const componentsDir = path.join(process.cwd(), 'src', 'components');
    const files = getAllTsxFiles(componentsDir);

    const cyrillicRegex = /[\u0400-\u04FF]+/g;
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      if (ALLOWED_DEV_FILES.has(fileName)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Skip components that use next-intl translation hooks
      if (content.includes('useTranslations') || content.includes('next-intl')) {
        continue;
      }

      const lines = content.split('\n');

      lines.forEach((lineText, lineIdx) => {
        const trimmed = lineText.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('import ') ||
          trimmed.includes('console.') ||
          trimmed.includes("t('") ||
          trimmed.includes('t("') ||
          trimmed.includes('navT(') ||
          trimmed.includes('c(')
        ) {
          return;
        }

        const cleanLine = lineText.split('//')[0];
        const lineWithoutJs = cleanLine.replace(/\{[^}]*\}/g, '');

        if (lineWithoutJs.includes('>') || lineWithoutJs.includes('placeholder=')) {
          const matches = lineWithoutJs.match(cyrillicRegex);
          if (matches) {
            for (const match of matches) {
              if (ALLOWED_ABBREVIATIONS.has(match)) continue;
              violations.push({
                file: fileName,
                line: lineIdx + 1,
                text: match,
              });
            }
          }
        }
      });
    }

    expect(violations, `Found ${violations.length} un-localized Cyrillic text nodes`).toEqual([]);
  });
});
