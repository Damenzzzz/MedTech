# AGENTS.md

## Project
Build a working MVP of an AI clinical support and medical training platform for Kazakhstan.

Before making changes, read:
- `docs/PROJECT_SPEC.md`
- `docs/DATASET_GUIDE.md`
- `docs/IMPLEMENTATION_PLAN.md`

## Product principles
- This is clinical decision support, not an autonomous diagnostic system.
- The doctor makes the final decision.
- Every medical conclusion shown in the UI must be linked to retrieved evidence from official Kazakhstan clinical protocols.
- Do not invent diagnoses, ICD-10 codes, quotations, dosages, contraindications, or source references.
- Return `insufficient_information` when grounding is weak.
- Keep “unknown/not asked” separate from “asked and absent”.
- Use only open, synthetic, or properly anonymized data.

## MVP scope
Implement this vertical flow first:

1. Doctor enters or uploads a doctor–patient dialogue.
2. Extract a structured clinical encounter.
3. Reuse the existing RAG over Kazakhstan protocols.
4. Return:
   - concise visit summary;
   - up to three differential diagnoses;
   - ICD-10 codes;
   - supporting/contradicting findings;
   - missing questions or examinations;
   - red flags;
   - exact protocol evidence.
5. Generate an editable draft encounter note.
6. Doctor confirms or edits it.

After this works, implement one student patient-simulator scenario.

## Existing code
A teammate already has RAG code for the protocol corpus. Inspect and reuse it before writing a replacement.

Wrap it behind a stable interface such as:

```python
analyze_case(query: str, patient_context: dict | None = None) -> ClinicalAnalysis
```

Do not rewrite retrieval until it has been evaluated and a specific limitation has been measured.

## Engineering rules
- Use typed API schemas.
- Validate model output with Pydantic or equivalent.
- Preserve evidence IDs and metadata end to end.
- Log model version, prompt version, corpus version, retrieved chunk IDs, and latency.
- Build text input before audio.
- Keep prompts in version-controlled files.
- Run the app and tests before declaring a feature complete.
- Never fabricate fallback medical content.

## Working style
- Inspect the repository and data first.
- Write a short implementation plan before major changes.
- Make small, reviewable changes.
- Do not expand scope before the main flow works.
- Update `docs/PROGRESS.md` after each milestone.
