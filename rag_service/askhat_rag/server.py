"""
Main FastAPI server for the Qazcode Clinical Diagnosis Assistant.
Serves POST /diagnose endpoint and a web UI at GET /.
"""

import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()  # load .env before anything reads os.getenv()

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from askhat_rag.config import make_llm_client
from askhat_rag.data_loader import (
    load_all_protocols,
    build_icd_lookup,
    get_all_valid_icd_codes,
    load_few_shot_examples,
)
from askhat_rag.indexer import build_or_load_indexes, build_or_load_trees
from askhat_rag.retriever import (
    init_retriever,
    hybrid_search,
    retrieve,
    retrieve_with_candidates,
    rerank_chunks,
    select_top_chunks,
)
from askhat_rag.query_analyzer import analyze_query
from askhat_rag.generator import generate_case_assessment, generate_diagnosis
import askhat_rag.postprocessor as postprocessor

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

_protocols = {}
_few_shot_examples = []
_llm_client = None
_case_cache: dict[str, dict] = {}
_CASE_TTL_SECONDS = 60 * 60


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _protocols, _few_shot_examples, _llm_client

    print("Loading protocols...")
    default_corpus = "data/corpus/corpus/protocols_corpus.jsonl"
    for candidate in (
        "data/corpus/merged_protocols_structured_dedup.jsonl",
        "data/corpus/merged_protocols.jsonl",
    ):
        if Path(candidate).exists():
            default_corpus = candidate
            break
    corpus_path = os.getenv("CORPUS_PATH", default_corpus)
    test_set_path = os.getenv("TEST_SET_PATH", "data/test_set/")

    _protocols = load_all_protocols(corpus_path)
    icd_to_protocols = build_icd_lookup(_protocols)

    # Populate global valid ICD codes for postprocessor
    postprocessor.ALL_VALID_ICD_CODES.update(
        get_all_valid_icd_codes(_protocols)
    )

    print("Loading indexes...")
    bm25, faiss, embed, chunks = build_or_load_indexes(_protocols)
    for chunk in chunks:
        protocol = _protocols.get(chunk.protocol_id)
        if protocol is None:
            continue
        chunk.protocol_title = protocol.title
        chunk.icd_codes = list(dict.fromkeys(chunk.icd_codes + protocol.icd_codes))
        chunk.icd_labels = protocol.icd_labels

    print("Loading trees...")
    tree_map = build_or_load_trees(_protocols)

    # Initialise retriever module globals
    init_retriever(bm25, faiss, embed, chunks, tree_map, _protocols, icd_to_protocols)

    print("Loading few-shot examples...")
    few_shot_count = max(0, int(os.getenv("FEW_SHOT_COUNT", "0")))
    _few_shot_examples = (
        load_few_shot_examples(test_set_path, n=few_shot_count)
        if few_shot_count
        else []
    )

    print("Initialising LLM client...")
    _llm_client = make_llm_client()

    print("Server ready!")
    yield


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Qazcode Clinical Diagnosis Assistant", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class DiagnoseRequest(BaseModel):
    symptoms: str = ""


class RefineRequest(BaseModel):
    case_id: str
    additional_info: str = ""
    symptoms: str = ""


class FindingEvidence(BaseModel):
    finding: str
    present: bool = True
    status: str = "present"
    patient_evidence: str | None = None
    protocol_source: str | None = None


class DiagnosisItem(BaseModel):
    rank: int
    diagnosis: str
    icd10_code: str
    explanation: str
    why_this_diagnosis: str | None = None
    confidence: str | None = None
    supporting_findings: list[FindingEvidence] = Field(default_factory=list)
    missing_findings: list[str] = Field(default_factory=list)
    recommended_checks: list[str] = Field(default_factory=list)
    protocol_criteria: list[str] = Field(default_factory=list)


class FollowUpQuestion(BaseModel):
    question: str
    target_diagnoses: list[str] = Field(default_factory=list)
    rationale: str = ""


class SourceItem(BaseModel):
    protocol_id: str
    title: str
    section_type: str
    icd_codes: list[str]
    excerpt: str


class DiagnoseResponse(BaseModel):
    case_id: str | None = None
    diagnoses: list[DiagnosisItem]
    sources: list[SourceItem] = Field(default_factory=list)
    follow_up_questions: list[FollowUpQuestion] = Field(default_factory=list)
    cached_context: bool = False
    interaction_count: int = 0
    context_candidates: int = 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(request: DiagnoseRequest):
    """Main diagnosis endpoint evaluated by evaluate.py."""
    query = request.symptoms or ""

    if not query.strip():
        return DiagnoseResponse(diagnoses=[])

    try:
        return await _run_full_diagnosis(query)

    except Exception as e:
        print(f"Pipeline error: {e}")
        return _fallback_response(query)


@app.post("/api/refine", response_model=DiagnoseResponse)
async def refine_case(request: RefineRequest):
    """Refine diagnoses using cached top protocol chunks, without running full RAG again."""
    cached = _case_cache.get(request.case_id)
    if not cached or time.time() - cached["created_at"] > _CASE_TTL_SECONDS:
        fallback_query = "\n\n".join(
            part
            for part in (
                request.symptoms.strip(),
                f"Уточняющие ответы пациента:\n{request.additional_info.strip()}"
                if request.additional_info.strip()
                else "",
            )
            if part
        )
        if fallback_query:
            return await _run_full_diagnosis(fallback_query)
        return DiagnoseResponse(diagnoses=[], cached_context=False)

    additional_info = request.additional_info.strip()
    if not additional_info:
        return DiagnoseResponse(
            case_id=request.case_id,
            diagnoses=[DiagnosisItem(**d) for d in cached["assessment"]["diagnoses"]],
            sources=_source_items(cached["chunks"]),
            follow_up_questions=[
                FollowUpQuestion(**q) for q in cached["assessment"].get("follow_up_questions", [])
            ],
            cached_context=True,
            interaction_count=len(cached["updates"]),
            context_candidates=len(cached.get("candidate_pool") or cached["chunks"]),
        )

    refined_query = (
        f"{cached['query']}\n\n"
        f"Предыдущие ответы пациента:\n{chr(10).join(cached['updates']) or 'нет'}\n\n"
        f"Дополнительные ответы пациента на уточняющие вопросы врача:\n{additional_info}"
    )

    # Fast path: rerank only the previously retrieved context instead of rebuilding
    # query analysis, embeddings, BM25 and ICD lookup.
    candidate_pool = cached.get("candidate_pool") or cached["chunks"]
    reranked = rerank_chunks(refined_query, candidate_pool, top_n=len(candidate_pool))
    refined_chunks = select_top_chunks(reranked, max_chunks=10, max_chars=22000)
    assessment = await generate_case_assessment(
        refined_query,
        refined_chunks,
        cached["analysis"],
        _llm_client,
        _few_shot_examples,
    )
    assessment = _stabilize_refined_assessment(cached["assessment"], assessment)
    cached["updates"].append(additional_info)
    cached["chunks"] = refined_chunks
    cached["candidate_pool"] = reranked
    cached["assessment"] = assessment
    cached["updated_at"] = time.time()

    return DiagnoseResponse(
        case_id=request.case_id,
        diagnoses=[DiagnosisItem(**d) for d in assessment["diagnoses"]],
        sources=_source_items(refined_chunks),
        follow_up_questions=[
            FollowUpQuestion(**q) for q in assessment.get("follow_up_questions", [])
        ],
        cached_context=True,
        interaction_count=len(cached["updates"]),
        context_candidates=len(candidate_pool),
    )


@app.post("/api/retrieve")
async def retrieve_evidence(request: DiagnoseRequest) -> dict:
    """Return retrieved protocol evidence for local evaluation and UI inspection."""
    query = request.symptoms or ""
    if not query.strip():
        return {"analysis": {}, "chunks": []}

    analysis = await analyze_query(query, _llm_client)
    context_chunks, analysis = await retrieve(query, analysis, _llm_client)
    return {
        "analysis": analysis,
        "chunks": [
            {
                "chunk_id": chunk.chunk_id,
                "protocol_id": chunk.protocol_id,
                "protocol_title": chunk.protocol_title,
                "source_file": _protocols.get(chunk.protocol_id).source_file if _protocols.get(chunk.protocol_id) else "",
                "section_type": chunk.section_type,
                "icd_codes": chunk.icd_codes,
                "icd_labels": getattr(chunk, "icd_labels", {}),
                "text": chunk.text[:1200],
            }
            for chunk in context_chunks
        ],
    }


async def _run_full_diagnosis(query: str) -> DiagnoseResponse:
    """Run full RAG and cache the resulting differential for later refinement."""
    analysis = await analyze_query(query, _llm_client)
    context_chunks, candidate_pool = await retrieve_with_candidates(query, analysis, _llm_client)
    assessment = await generate_case_assessment(
        query, context_chunks, analysis, _llm_client, _few_shot_examples
    )
    case_id = _remember_case(query, analysis, context_chunks, candidate_pool, assessment)
    return DiagnoseResponse(
        case_id=case_id,
        diagnoses=[DiagnosisItem(**d) for d in assessment["diagnoses"]],
        sources=_source_items(context_chunks),
        follow_up_questions=[
            FollowUpQuestion(**q) for q in assessment.get("follow_up_questions", [])
        ],
        context_candidates=len(candidate_pool),
    )


def _fallback_response(query: str) -> DiagnoseResponse:
    """BM25-only fallback when the full pipeline fails."""
    try:
        results = hybrid_search([query], top_k=3)
        diagnoses = []
        rank = 1
        seen_codes: set[str] = set()
        for chunk in results:
            for code in chunk.icd_codes:
                if code not in seen_codes and rank <= 3:
                    seen_codes.add(code)
                    diagnoses.append(DiagnosisItem(
                        rank=rank,
                        diagnosis=chunk.protocol_title or "Неизвестный диагноз",
                        icd10_code=code,
                        explanation=chunk.text[:200],
                    ))
                    rank += 1
        if diagnoses:
            return DiagnoseResponse(diagnoses=diagnoses)
    except Exception:
        pass
    return DiagnoseResponse(diagnoses=[])


def _stabilize_refined_assessment(previous: dict, refined: dict) -> dict:
    """Refine should rerank existing RAG candidates, not erase them on noisy input."""
    previous_diagnoses = previous.get("diagnoses", []) if previous else []
    refined_diagnoses = refined.get("diagnoses", []) if refined else []
    if not refined_diagnoses:
        return {
            "diagnoses": previous_diagnoses,
            "follow_up_questions": (
                refined.get("follow_up_questions") if refined else None
            ) or previous.get("follow_up_questions", []),
        }

    merged = []
    seen_codes: set[str] = set()
    for item in refined_diagnoses:
        code = str(item.get("icd10_code", "")).strip().upper()
        if not code or code in seen_codes:
            continue
        merged.append(item)
        seen_codes.add(code)

    for item in previous_diagnoses:
        code = str(item.get("icd10_code", "")).strip().upper()
        if not code or code in seen_codes:
            continue
        preserved = dict(item)
        preserved["confidence"] = preserved.get("confidence") or "low"
        missing = list(preserved.get("missing_findings") or [])
        note = "Сохранено из первичного RAG-кандидата: уточнение не исключило этот вариант."
        if note not in missing:
            missing.append(note)
        preserved["missing_findings"] = missing
        merged.append(preserved)
        seen_codes.add(code)
        if len(merged) >= 4:
            break

    for index, item in enumerate(merged, start=1):
        item["rank"] = index
    return {
        "diagnoses": merged,
        "follow_up_questions": refined.get("follow_up_questions") or previous.get("follow_up_questions", []),
    }


def _source_items(context_chunks) -> list[SourceItem]:
    source_items = []
    seen_protocols = set()
    for chunk in context_chunks:
        if chunk.protocol_id in seen_protocols:
            continue
        seen_protocols.add(chunk.protocol_id)
        source_items.append(SourceItem(
            protocol_id=chunk.protocol_id,
            title=chunk.protocol_title or chunk.protocol_id,
            section_type=chunk.section_type,
            icd_codes=chunk.icd_codes[:20],
            excerpt=chunk.text[:700],
        ))
        if len(source_items) >= 6:
            break
    return source_items


def _remember_case(
    query: str,
    analysis: dict,
    context_chunks,
    candidate_pool,
    assessment: dict,
) -> str:
    now = time.time()
    expired = [
        case_id for case_id, item in _case_cache.items()
        if now - item["created_at"] > _CASE_TTL_SECONDS
    ]
    for case_id in expired:
        _case_cache.pop(case_id, None)
    while len(_case_cache) > 50:
        oldest = min(_case_cache, key=lambda key: _case_cache[key]["created_at"])
        _case_cache.pop(oldest, None)

    case_id = str(uuid.uuid4())
    _case_cache[case_id] = {
        "query": query,
        "analysis": analysis,
        "chunks": context_chunks,
        "candidate_pool": candidate_pool,
        "assessment": assessment,
        "updates": [],
        "created_at": now,
        "updated_at": now,
    }
    return case_id


@app.get("/", response_class=HTMLResponse)
async def web_ui():
    """Serve the web UI."""
    ui_path = Path("askhat_rag/static/index.html")
    if ui_path.exists():
        return ui_path.read_text(encoding="utf-8")
    return "<h1>Qazcode Diagnosis API</h1><p>POST /diagnose with {\"symptoms\": \"...\"}</p>"


@app.get("/health")
async def health():
    return {"status": "ok", "protocols": len(_protocols)}
