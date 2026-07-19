from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ProtocolDocument(BaseModel):
    protocol_id: str
    source_file: str
    title: str
    icd_codes: list[str] = Field(default_factory=list)
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceSource(BaseModel):
    source_id: str
    protocol_id: str
    title: str
    source_file: str
    section: str | None = None
    icd_codes: list[str] = Field(default_factory=list)
    score: float
    text: str


class Diagnosis(BaseModel):
    rank: int
    diagnosis: str
    icd10_code: str
    explanation: str
    supporting_findings: list[str] = Field(default_factory=list)
    missing_findings: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)


class ClinicalAnalysis(BaseModel):
    status: Literal[
        "ok",
        "insufficient_information",
        "retrieval_failed",
        "needs_immediate_clinical_review",
    ]
    summary: str
    diagnoses: list[Diagnosis] = Field(default_factory=list)
    missing_questions: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    recommended_checks: list[str] = Field(default_factory=list)
    sources: list[EvidenceSource] = Field(default_factory=list)
    draft_note: dict[str, str] = Field(default_factory=dict)
    meta: dict[str, Any] = Field(default_factory=dict)
