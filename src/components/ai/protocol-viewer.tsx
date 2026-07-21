'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProtocolSource } from '@/domain/schemas';

type ProtocolDocument = {
  protocol_id: string;
  title: string;
  source_file: string;
  text: string;
};

export function ProtocolViewer({
  source,
  onClose,
}: {
  source: ProtocolSource | null;
  onClose: () => void;
}) {
  const t = useTranslations('ProtocolViewer');
  const [document, setDocument] = useState<ProtocolDocument | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const markRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!source?.protocolId) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError('');
      setDocument(null);
    });

    fetch(`/api/protocols/${encodeURIComponent(source.protocolId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || body.detail || `Ошибка ${response.status}`);
        return body as ProtocolDocument;
      })
      .then(setDocument)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить протокол');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [source]);

  const match = useMemo(() => {
    if (!document || !source) return null;
    const chunk = source.chunkText || source.excerpt || '';
    const found = findQuotedRange(document.text, chunk);
    if (!found && chunk) {
      console.warn('[protocol-viewer] cited chunk was not found in protocol text', {
        protocolId: source.protocolId,
        sourceFile: source.sourceFile,
      });
    }
    return found;
  }, [document, source]);

  useEffect(() => {
    if (match) markRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [match]);

  if (!source) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-[60] bg-slate-950/65" onClick={onClose} aria-label={t('closeProtocol')} />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-3xl flex-col border-l border-white/10 bg-[#0f1917] text-slate-100 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <BookOpen className="mt-0.5 shrink-0 text-teal-300" size={20} />
            <div className="min-w-0">
              <h2 className="font-semibold">{document?.title || source.title}</h2>
              <p className="mt-1 truncate text-xs text-slate-400">
                {document?.source_file || source.sourceFile || source.protocolId}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={t('close')}>
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="animate-spin" size={17} />{t('loading')}</div>}
          {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          {document && (
            <article className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {match ? (
                <>
                  {document.text.slice(0, match.start)}
                  <mark ref={markRef} className="rounded bg-amber-300 px-0.5 text-slate-950">{document.text.slice(match.start, match.end)}</mark>
                  {document.text.slice(match.end)}
                </>
              ) : document.text}
            </article>
          )}
        </div>
      </aside>
    </>
  );
}

export function findQuotedRange(text: string, chunk: string): { start: number; end: number } | null {
  const needle = chunk.trim();
  if (!needle) return null;

  const exactStart = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (exactStart >= 0) return { start: exactStart, end: exactStart + needle.length };

  const firstWords = needle.split(/\s+/).filter(Boolean).slice(0, 10);
  if (firstWords.length < 3) return null;
  const normalizedText = normalizeWithOffsets(text);
  for (let count = firstWords.length; count >= 3; count -= 1) {
    const normalizedNeedle = firstWords.slice(0, count).map(normalizeWord).filter(Boolean).join(' ');
    const normalizedStart = normalizedText.value.indexOf(normalizedNeedle);
    if (normalizedStart < 0) continue;
    const normalizedEnd = normalizedStart + normalizedNeedle.length - 1;
    return {
      start: normalizedText.offsets[normalizedStart],
      end: normalizedText.offsets[normalizedEnd] + 1,
    };
  }
  return null;
}

function normalizeWord(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeWithOffsets(text: string) {
  let value = '';
  const offsets: number[] = [];
  let pendingSpace = false;

  for (let index = 0; index < text.length; index += 1) {
    const normalized = normalizeWord(text[index]);
    if (!normalized) {
      pendingSpace = value.length > 0;
      continue;
    }
    if (pendingSpace) {
      value += ' ';
      offsets.push(index);
      pendingSpace = false;
    }
    value += normalized;
    offsets.push(index);
  }
  return { value, offsets };
}
