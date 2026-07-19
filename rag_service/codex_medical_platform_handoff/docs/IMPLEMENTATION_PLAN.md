# 2–3 Day Implementation Plan

## Phase 0 — Inspect
- Read repository structure.
- Find the existing RAG.
- Locate `corpus.zip` and `test_set`.
- Run current code unchanged.
- Record current input, output, latency, and errors.
- Update `docs/PROGRESS.md`.

## Day 1 — Clinical core

### Morning
- Build data inspection script.
- Wrap RAG in a function or FastAPI endpoint.
- Define Pydantic schemas.
- Run 20 representative test cases.

### Afternoon
- Implement dialogue → structured encounter.
- Implement RAG query builder.
- Generate differential diagnoses with source IDs.
- Add missing-question extraction.
- Add output validation.

### Evening
- Build an end-to-end API.
- Add evaluation for Top-1, Top-3, and ICD-10.
- Fix critical bugs.
- Freeze one stable demo case.

## Day 2 — Interface

### Morning
- Build clinical encounter page.
- Add dialogue input.
- Display structured fields.
- Display diagnoses and sources.
- Add editable draft note.

### Afternoon
- Add audio upload only if text flow is stable.
- Add protocol assistant.
- Add evaluation page.
- Improve errors and loading states.

### Evening
- Run end-to-end tests.
- Prepare one success, one ambiguous, and one safety case.
- Ensure one-command startup.
- Prepare a backup demo recording.

## Optional Day 3
1. Improve retrieval based on measured failures.
2. Add one complete student simulator case.
3. Add Russian/Kazakh mixed-language example.
4. Improve design.
5. Add Docker.

## Acceptance criteria
- Dialogue can be entered.
- Structured facts are extracted.
- RAG returns real evidence.
- Up to three diagnoses and ICD-10 are displayed.
- Missing questions are shown.
- Draft note is editable.
- Unsupported claims are not shown as facts.
- Evaluation is reproducible.
- Ground truth never leaks into inference.
