from __future__ import annotations

import json
import os
from typing import Any
from urllib import request

from app.rag.schemas import Diagnosis, EvidenceSource


SYSTEM_PROMPT = """You are a Kazakhstan clinical decision support assistant.
Use only the retrieved protocol excerpts.
Do not invent ICD-10 codes, diagnoses, dosages, contraindications, or source references.
If evidence is weak, return an empty diagnoses list.
Return JSON only with this shape:
{"diagnoses":[{"rank":1,"diagnosis":"...","icd10_code":"...","explanation":"...","source_ids":["..."]}],"missing_questions":["..."],"recommended_checks":["..."]}"""


def llm_available() -> bool:
    return bool(
        (os.getenv("LLM_BASE_URL") or os.getenv("HUB_URL"))
        and (os.getenv("LLM_API_KEY") or os.getenv("API_KEY"))
    )


def generate_with_gpt_oss(query: str, sources: list[EvidenceSource]) -> dict[str, Any] | None:
    hub_url = (os.getenv("LLM_BASE_URL") or os.getenv("HUB_URL") or "").rstrip("/")
    api_key = os.getenv("LLM_API_KEY") or os.getenv("API_KEY") or ""
    model = os.getenv("LLM_MODEL") or os.getenv("MODEL", "oss-120b")
    if not hub_url or not api_key:
        return None

    context = "\n\n".join(
        f"SOURCE_ID: {source.source_id}\nTITLE: {source.title}\nICD_CODES: {', '.join(source.icd_codes)}\nTEXT: {source.text}"
        for source in sources
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Patient symptoms/dialogue:\n{query}\n\nRetrieved protocol excerpts:\n{context}"},
        ],
        "temperature": 0,
    }
    req = request.Request(
        f"{hub_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=45) as response:
            raw = json.loads(response.read().decode("utf-8"))
        content = raw["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return None


def validated_llm_diagnoses(payload: dict[str, Any], sources: list[EvidenceSource]) -> list[Diagnosis]:
    valid_source_ids = {source.source_id for source in sources}
    valid_codes = {code for source in sources for code in source.icd_codes}
    diagnoses: list[Diagnosis] = []
    for raw in payload.get("diagnoses", [])[:3]:
        source_ids = [sid for sid in raw.get("source_ids", []) if sid in valid_source_ids]
        code = str(raw.get("icd10_code") or raw.get("icd_code") or "").upper()
        if not source_ids or (valid_codes and code not in valid_codes):
            continue
        diagnoses.append(
            Diagnosis(
                rank=len(diagnoses) + 1,
                diagnosis=str(raw.get("diagnosis") or raw.get("name") or "")[:160],
                icd10_code=code,
                explanation=str(raw.get("explanation") or "")[:900],
                source_ids=source_ids,
            )
        )
    return diagnoses
