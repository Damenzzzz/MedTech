# Project Specification

## Working title
**AI Clinical Platform KZ**

## Description
A unified AI platform based on official Kazakhstan clinical protocols that helps medical workers document real appointments, retrieve protocol-grounded evidence, form a differential diagnosis, and train students through virtual-patient simulations.

## Primary user
A primary-care doctor or rural feldsher who may not have immediate access to a specialist.

## Secondary user
A medical student who needs realistic patient-interview practice.

## Core modules

### 1. Clinical Scribe
Input:
- text dialogue;
- uploaded audio;
- optional live recording later.

Output:
- speaker-labelled transcript;
- complaints;
- history of present illness;
- medical history;
- allergies;
- medications;
- objective findings;
- missing information;
- editable draft note.

The system must not invent missing information.

### 2. Protocol-grounded Clinical Assistant
Uses RAG over official Kazakhstan clinical protocols.

Output:
- up to three differential diagnoses;
- ICD-10 codes;
- evidence supporting each diagnosis;
- evidence against or missing;
- follow-up questions;
- red flags;
- recommended checks;
- exact protocol sources.

The final decision remains with the doctor.

### 3. Protocol Navigator
A focused assistant that answers only from retrieved protocol sections.

### 4. Student Patient Simulator
The AI plays a patient from a hidden case card.

Rules:
- reveal only information the student asks for;
- do not reveal the diagnosis;
- remain internally consistent;
- do not invent symptoms;
- use a defined personality.

After the encounter:
- student submits diagnosis and ICD-10;
- compare with ground truth;
- show missed questions and red flags;
- explain errors using protocol evidence.

## Main clinical flow

```text
Doctor–patient dialogue
        ↓
Speech-to-text or text input
        ↓
Structured encounter extraction
        ↓
Completeness and red-flag checks
        ↓
RAG query generation
        ↓
Protocol retrieval
        ↓
Differential diagnosis with evidence
        ↓
Output validation
        ↓
Editable draft note
        ↓
Doctor confirms or edits
```

## Structured encounter schema

```json
{
  "patient_context": {
    "age": null,
    "sex": null,
    "pregnancy_week": null,
    "known_conditions": [],
    "allergies": null,
    "current_medications": null
  },
  "chief_complaints": [],
  "history_of_present_illness": {
    "duration": null,
    "onset": null,
    "progression": null
  },
  "associated_symptoms": [],
  "negative_findings": [],
  "objective_findings": {},
  "red_flags": [],
  "missing_information": [],
  "evidence_spans": []
}
```

Important:
- `null` means unknown/not asked;
- `[]` means explicitly asked and absent only when supported.

## Clinical analysis schema

```json
{
  "status": "ok",
  "summary": "",
  "differential_diagnoses": [
    {
      "diagnosis": "",
      "icd10": "",
      "rank": 1,
      "supporting_findings": [],
      "contradicting_findings": [],
      "missing_findings": [],
      "source_ids": []
    }
  ],
  "missing_questions": [],
  "red_flags": [],
  "recommended_checks": [],
  "draft_note": {
    "complaints": "",
    "history": "",
    "assessment": "",
    "plan": ""
  }
}
```

Allowed statuses:
- `ok`
- `insufficient_information`
- `retrieval_failed`
- `needs_immediate_clinical_review`

Do not display uncalibrated percentages.

## RAG requirements
- Reuse the teammate's current RAG first.
- Preserve document ID, title, ICD-10, section, language, version/date, and raw source text.
- Build a focused query from the structured encounter.
- Keep source IDs through the full pipeline.
- Generate only from retrieved evidence.
- Validate every displayed source.

If time permits:
- hybrid dense + BM25;
- reranking;
- metadata filters;
- parent/child retrieval.

## Student simulation MVP
One fully developed scenario with:
- patient persona;
- hidden facts;
- required questions;
- true diagnosis and ICD-10;
- protocol-grounded feedback.

## UI pages
- Dashboard
- Clinical encounter
- Protocol assistant
- Student simulator
- Evaluation metrics

## Differentiation
This is not a generic ChatGPT medical prompt. It combines:
- official Kazakhstan protocol grounding;
- measurable evaluation;
- automatic documentation;
- missing-information detection;
- source-linked differential diagnosis;
- the same engine for practice and student training;
- Russian/Kazakh localization.

## Non-goals for first MVP
- autonomous diagnosis;
- autonomous prescribing;
- production clinic deployment;
- full hospital information system;
- home monitoring;
- full FHIR server;
- training a custom speech model;
- dozens of simulator cases.
