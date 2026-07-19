from __future__ import annotations

import re
import time
from collections import defaultdict
from pathlib import Path

from app.rag.index import RagIndex
from app.rag.llm import generate_with_gpt_oss, llm_available, validated_llm_diagnoses
from app.rag.schemas import ClinicalAnalysis, Diagnosis, EvidenceSource
from app.rag.text import extract_icd_codes, normalize_text


DEFAULT_MISSING_QUESTIONS = [
    "Уточнить длительность, начало и динамику симптомов.",
    "Уточнить температуру, боль, одышку, кровотечение и другие тревожные симптомы.",
    "Уточнить хронические заболевания, беременность, аллергии и текущие лекарства.",
]

RED_FLAG_TERMS = {
    "одыш": "Одышка или дыхательная недостаточность требует срочной клинической оценки.",
    "боль в груди": "Боль в груди требует исключения жизнеугрожающих причин.",
    "потеря созн": "Потеря сознания требует срочной очной оценки.",
    "кровотеч": "Кровотечение является потенциальным красным флагом.",
    "судорог": "Судороги требуют срочной клинической оценки.",
}


class ClinicalRagAssistant:
    def __init__(self, index_path: Path) -> None:
        self.index_path = index_path
        self.index = RagIndex.load(index_path)

    def analyze_case(self, query: str, patient_context: dict | None = None, top_k: int = 5) -> ClinicalAnalysis:
        started = time.perf_counter()
        cleaned_query = normalize_text(query)
        if len(cleaned_query) < 8:
            return ClinicalAnalysis(
                status="insufficient_information",
                summary="Недостаточно информации для поиска по протоколам.",
                missing_questions=DEFAULT_MISSING_QUESTIONS,
                meta=self._meta(started, top_k, []),
            )

        context_text = " ".join(str(v) for v in (patient_context or {}).values() if v)
        retrieved = self.index.search(f"{cleaned_query} {context_text}", top_k=top_k)
        if not retrieved:
            return ClinicalAnalysis(
                status="retrieval_failed",
                summary="Не найдены релевантные фрагменты протоколов.",
                missing_questions=DEFAULT_MISSING_QUESTIONS,
                meta=self._meta(started, top_k, []),
            )

        llm_payload = generate_with_gpt_oss(cleaned_query, retrieved) if llm_available() else None
        diagnoses = validated_llm_diagnoses(llm_payload, retrieved) if llm_payload else []
        if not diagnoses:
            diagnoses = build_diagnoses(cleaned_query, retrieved)
        status = "ok" if diagnoses else "insufficient_information"
        red_flags = detect_red_flags(cleaned_query)
        if red_flags:
            status = "needs_immediate_clinical_review"
        return ClinicalAnalysis(
            status=status,
            summary=f"Найдено {len(retrieved)} релевантных фрагментов протоколов. Выводы ниже являются клинической поддержкой, окончательное решение принимает врач.",
            diagnoses=diagnoses,
            missing_questions=DEFAULT_MISSING_QUESTIONS if len(cleaned_query.split()) < 25 else [],
            red_flags=red_flags,
            recommended_checks=build_recommended_checks(retrieved),
            sources=retrieved,
            draft_note={
                "complaints": cleaned_query,
                "history": "Заполнить после уточнения анамнеза и объективных данных.",
                "assessment": "; ".join(f"{d.diagnosis} ({d.icd10_code})" for d in diagnoses[:3]) or "Недостаточно данных.",
                "plan": "Сверить с указанными фрагментами протокола; провести недостающие вопросы и осмотр.",
            },
            meta=self._meta(started, top_k, [s.source_id for s in retrieved]),
        )

    def _meta(self, started: float, top_k: int, source_ids: list[str]) -> dict:
        return {
            "retriever": "local_bm25_recursive_chunks",
            "generator": "gpt_oss_openai_compatible" if llm_available() else "local_source_grounded_heuristics",
            "chunking": "recursive_700_overlap_100",
            "top_k": top_k,
            "index_path": str(self.index_path),
            "source_ids": source_ids,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        }


def build_diagnoses(query: str, sources: list[EvidenceSource]) -> list[Diagnosis]:
    grouped: defaultdict[str, list[EvidenceSource]] = defaultdict(list)
    for source in sources:
        codes = source.icd_codes or extract_icd_codes(source.text) or ["UNKNOWN"]
        for code in codes[:4]:
            grouped[code].append(source)

    ranked = sorted(grouped.items(), key=lambda item: sum(s.score for s in item[1]), reverse=True)
    diagnoses: list[Diagnosis] = []
    for rank, (code, code_sources) in enumerate(ranked[:3], start=1):
        best = max(code_sources, key=lambda s: s.score)
        diagnosis = diagnosis_name(best, code)
        diagnoses.append(
            Diagnosis(
                rank=rank,
                diagnosis=diagnosis,
                icd10_code=code,
                explanation=make_explanation(best),
                supporting_findings=matched_terms(query, best.text),
                missing_findings=[],
                source_ids=[s.source_id for s in code_sources[:3]],
            )
        )
    return diagnoses


def diagnosis_name(source: EvidenceSource, code: str) -> str:
    title = source.title.strip()
    if title and title.lower() not in {"одобрен", "protocol", "протокол"}:
        return title[:140]
    match = re.search(
        r"КЛИНИЧЕСКИЙ ПРОТОКОЛ(?:\s+ДИАГНОСТИКИ И ЛЕЧЕНИЯ)?\s+(.{8,180}?)(?:\s+[IVX]\.|1\.1|Код\(ы\)|МКБ-10|$)",
        source.text,
        flags=re.IGNORECASE,
    )
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip(" «»\"")[:140]
    return f"Диагноз по протоколу {code}"


def make_explanation(source: EvidenceSource) -> str:
    text = source.text
    if len(text) <= 420:
        return text
    return text[:420].rsplit(" ", 1)[0] + "..."


def matched_terms(query: str, text: str) -> list[str]:
    query_words = {w for w in query.lower().split() if len(w) >= 5}
    lower_text = text.lower()
    return sorted({word for word in query_words if word in lower_text})[:8]


def detect_red_flags(query: str) -> list[str]:
    lower = query.lower()
    return [message for needle, message in RED_FLAG_TERMS.items() if needle in lower]


def build_recommended_checks(sources: list[EvidenceSource]) -> list[str]:
    checks: list[str] = []
    for source in sources:
        lower = source.text.lower()
        if "анализ" in lower:
            checks.append("Проверить лабораторные анализы, указанные в протоколе.")
        if "осмотр" in lower or "обслед" in lower:
            checks.append("Провести объективный осмотр и рекомендованные обследования.")
        if "дифференциаль" in lower:
            checks.append("Сверить дифференциальный диагноз с разделом протокола.")
    return list(dict.fromkeys(checks))[:5]
