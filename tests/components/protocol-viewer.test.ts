import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { findQuotedRange } from '@/components/ai/protocol-viewer';
import { normalizeDiagnoseResponse } from '@/lib/ai/clinical-service.server';

describe('protocol source metadata and highlighting', () => {
  it('normalizes Python snake_case source fields without losing the exact chunk', () => {
    const result = normalizeDiagnoseResponse({
      case_id: 'case-1',
      diagnoses: [],
      sources: [{
        protocol_id: 'p-1',
        title: 'HELLP СИНДРОМ',
        source_file: 'HELLP-СИНДРОМ.pdf',
        section_type: 'diagnostic_criteria',
        excerpt: 'Короткая цитата',
        chunk_text: 'Точный полный текст процитированного чанка',
      }],
    }, 'request-1');

    expect(result.sources[0]).toMatchObject({
      protocolId: 'p-1',
      sourceFile: 'HELLP-СИНДРОМ.pdf',
      sectionType: 'diagnostic_criteria',
      chunkText: 'Точный полный текст процитированного чанка',
    });
  });

  it('finds exact and whitespace-normalized quoted text', () => {
    const text = 'Введение. Диагностические\n  критерии: АД выше 160 мм. Конец.';
    const exact = findQuotedRange(text, 'АД выше 160 мм');
    expect(exact).not.toBeNull();
    expect(text.slice(exact!.start, exact!.end)).toBe('АД выше 160 мм');

    const normalized = findQuotedRange(
      text,
      'Диагностические критерии: АД выше 160 мм. дополнительные слова',
    );
    expect(normalized).not.toBeNull();
    expect(text.slice(normalized!.start, normalized!.end)).toContain('Диагностические');
  });
});
