from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.rag.schemas import EvidenceSource, ProtocolDocument
from app.rag.text import extract_icd_codes, recursive_chunks, tokenize


class RagIndex:
    def __init__(self, chunks: list[dict[str, Any]]) -> None:
        self.chunks = chunks
        self.doc_freq: Counter[str] = Counter()
        self.term_freqs: list[Counter[str]] = []
        self.lengths: list[int] = []
        self.postings: defaultdict[str, list[tuple[int, int]]] = defaultdict(list)
        for chunk in chunks:
            tokens = tokenize(chunk["text"])
            freq = Counter(tokens)
            self.term_freqs.append(freq)
            self.lengths.append(len(tokens))
            self.doc_freq.update(freq.keys())
            idx = len(self.term_freqs) - 1
            for term, tf in freq.items():
                self.postings[term].append((idx, tf))
        self.avg_len = sum(self.lengths) / max(len(self.lengths), 1)

    @classmethod
    def from_documents(cls, documents: list[ProtocolDocument], max_chars: int = 700, overlap: int = 100) -> "RagIndex":
        chunks: list[dict[str, Any]] = []
        for doc in documents:
            for i, text in enumerate(recursive_chunks(doc.text, max_chars=max_chars, overlap=overlap)):
                chunk_codes = extract_icd_codes(text)
                chunks.append(
                    {
                        "source_id": f"{doc.protocol_id}::chunk_{i}",
                        "protocol_id": doc.protocol_id,
                        "title": doc.title,
                        "source_file": doc.source_file,
                        "section": infer_section(text),
                        "icd_codes": chunk_codes or doc.icd_codes,
                        "text": text,
                    }
                )
        return cls(chunks)

    @classmethod
    def load(cls, path: Path) -> "RagIndex":
        payload = json.loads(path.read_text(encoding="utf-8"))
        return cls(payload["chunks"])

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"version": 1, "chunks": self.chunks}
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def search(self, query: str, top_k: int = 5) -> list[EvidenceSource]:
        query_terms = tokenize(query)
        if not query_terms or not self.chunks:
            return []
        q_freq = Counter(query_terms)
        scores: defaultdict[int, float] = defaultdict(float)
        n = len(self.chunks)
        k1 = 1.5
        b = 0.75
        for term, q_weight in q_freq.items():
            df = self.doc_freq.get(term, 0)
            if df == 0:
                continue
            idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
            for idx, tf in self.postings.get(term, []):
                denom = tf + k1 * (1 - b + b * self.lengths[idx] / max(self.avg_len, 1))
                scores[idx] += idf * (tf * (k1 + 1) / denom) * q_weight
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]
        return [EvidenceSource(score=round(score, 4), **self.chunks[idx]) for idx, score in ranked]


def infer_section(text: str) -> str | None:
    markers = [
        "диагност",
        "лечение",
        "критер",
        "дифференциаль",
        "жалоб",
        "обслед",
        "красн",
    ]
    lower = text.lower()
    for marker in markers:
        pos = lower.find(marker)
        if pos >= 0:
            start = max(0, pos - 40)
            end = min(len(text), pos + 80)
            return text[start:end]
    return None
