from __future__ import annotations

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.rag.assistant import ClinicalRagAssistant
from app.rag.ingest import build_index
from app.rag.schemas import ClinicalAnalysis

load_dotenv()

ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = ROOT / "data" / "index.json"
CORPUS_PATH = ROOT / "data" / "corpus"
WEB_PATH = ROOT / "app" / "web"
ASSISTANT: ClinicalRagAssistant | None = None


class AnalyzeRequest(BaseModel):
    query: str
    patient_context: dict | None = None
    top_k: int = 5


class DiagnoseRequest(BaseModel):
    symptoms: Optional[str] = ""


class DiagnoseResponse(BaseModel):
    diagnoses: list[dict]


def ensure_assistant() -> ClinicalRagAssistant:
    global ASSISTANT
    if ASSISTANT is not None:
        return ASSISTANT
    if not INDEX_PATH.exists():
        build_index(CORPUS_PATH, INDEX_PATH)
    ASSISTANT = ClinicalRagAssistant(INDEX_PATH)
    return ASSISTANT


app = FastAPI(title="AI Clinical Platform KZ")
app.mount("/static", StaticFiles(directory=WEB_PATH), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(WEB_PATH / "index.html")


@app.get("/api/health")
async def health() -> dict:
    assistant = ensure_assistant()
    return {
        "status": "ok",
        "chunks": len(assistant.index.chunks),
        "index_path": str(INDEX_PATH),
    }


@app.post("/api/analyze", response_model=ClinicalAnalysis)
async def analyze(request: AnalyzeRequest) -> ClinicalAnalysis:
    assistant = ensure_assistant()
    return assistant.analyze_case(request.query, request.patient_context, top_k=request.top_k)


@app.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(request: DiagnoseRequest) -> DiagnoseResponse:
    assistant = ensure_assistant()
    analysis = assistant.analyze_case(request.symptoms or "", top_k=5)
    diagnoses = [
        {
            "rank": item.rank,
            "diagnosis": item.diagnosis,
            "icd10_code": item.icd10_code,
            "explanation": item.explanation,
        }
        for item in analysis.diagnoses
    ]
    return DiagnoseResponse(diagnoses=diagnoses)
