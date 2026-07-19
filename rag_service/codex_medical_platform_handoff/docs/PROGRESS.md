# Progress

## Current status
- Project context prepared.
- Scope narrowed to the RAG assistant and a minimal test website first.
- Local RAG MVP implemented with recursive chunking and a FastAPI interface.

## Findings
- The handoff zip contains project documentation, not application source code.
- `dair-mus/qazcode-nu` exposes a challenge template: `src/mock_server.py`, `evaluate.py`, and `data/test_set`.
- The source README links the Kazakhstan protocol `corpus.zip` as the official knowledge base.
- Local `colab_upload.zip` contains RAG analysis artifacts; its recommendation is recursive chunking and `top_k=5`.

## Decisions
- Use `data/corpus` as the protocol input folder.
- Support JSON/TXT/PDF/DOCX/ZIP ingestion.
- Preserve protocol IDs, ICD-10 codes, chunk IDs, source files, titles, and source text in responses.
- Keep `/diagnose` compatible with the Qazcode evaluator while exposing richer `/api/analyze` for the UI.

## Completed
- Added local corpus loader and recursive chunker.
- Added BM25-style local retrieval index.
- Added clinical assistant wrapper with `analyze_case(query, patient_context)`.
- Added FastAPI server and static mini-site.
- Added sample demo corpus so the app can run before official protocols are provided.

## Next actions
- Replace sample corpus with official Kazakhstan protocol corpus.
- Run evaluation against `data/test_set`.
- Improve diagnosis naming and evidence extraction after inspecting real corpus fields.

## Known limitations
- Current demo corpus is synthetic and must not be used as official medical content.
- Retrieval is lexical BM25-style; dense embeddings/reranking are not yet added.
- The response generator is heuristic and source-grounded, not an LLM clinical reasoning layer.
