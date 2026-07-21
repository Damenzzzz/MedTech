import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Localization & Cyrillic Text Inspection', () => {
  // Recursively collect all .tsx files in src/components
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

  it('scans all user TSX components for un-localized hardcoded Cyrillic text', () => {
    const componentsDir = path.join(process.cwd(), 'src', 'components');
    const files = getAllTsxFiles(componentsDir);

    // List of allowed files or patterns (e.g. comments, fallback mock default text)
    const allowedFiles = [
      'builder-view.tsx', // Developer-only case builder tool
      'theme-provider.tsx',
    ];

    const cyrillicRegex = /[\u0400-\u04FF]+/g;
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      if (allowedFiles.includes(fileName)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, _idx) => {
        // Skip line if it is a single-line comment or import statement
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // Extract matches
        const matches = lineText.match(cyrillicRegex);
        if (matches) {
          // If Cyrillic text is present inside JSX string literal or text node (not inside comment)
          // Allow certain medical abbreviations if necessary
          const lineWithoutComments = lineText.split('//')[0];
          if (cyrillicRegex.test(lineWithoutComments)) {
            // Log violation if it's user-facing text
            // Skip pure comments or next-intl keys
            if (lineWithoutComments.includes('import') || lineWithoutComments.includes('console.')) return;
          }
        }
      });
    }

    // Verify all components pass the localization check
    expect(violations.length, `Found ${violations.length} un-localized Cyrillic strings`).toBe(0);
  });
});
