# AI Clinical Platform KZ

MVP: medical AI assistant with local RAG over Kazakhstan clinical protocols.

## What works now

- Loads the deduplicated Qazcode + official NRCHD protocol corpus.
- Runs the adapted `AskhatSBK/hackhathon_askhat_solution` pipeline.
- Uses hybrid BM25 + FAISS retrieval, ICD lookup, optional reranking, and GPT-5.5 grounded generation.
- Normalizes ICD codes extracted from PDF/OCR text, including Cyrillic variants.
- Serves:
  - `/diagnose`, with ranked diagnoses and retrieved protocol sources;
  - `/api/retrieve`, for retrieval diagnostics;
  - `/health`, for readiness checks;
  - `/`, the local RAG test UI.
- Keeps provider credentials server-side in the gitignored `.env` file.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m app.rag.ingest --corpus data/corpus --index data/index.json
uvicorn app.api.server:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. This is the lightweight offline fallback; the full
Askhat/Alem engine below is the primary demo.

## Run the Askhat RAG engine

This project also vendors the stronger `AskhatSBK/hackhathon_askhat_solution` RAG under `askhat_rag/`.

It uses:

- LLM query decomposition + HyDE;
- hybrid BM25 + FAISS retrieval;
- ICD-10 direct lookup;
- tree navigation over protocol sections;
- LLM diagnosis generation;
- ICD-10 validation.

Configure provider credentials:

```bash
cp .env.example .env
```

For the primary demo, set `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, and `LLM_MODEL=gpt-5.5`.
For Alem or another OpenAI-compatible LLM, set `LLM_PROVIDER=custom`, `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`.
For Qazcode GPT-OSS, set `LLM_PROVIDER=oss`, `GPT_OSS_BASE_URL`, `GPT_OSS_API_KEY`, and `LLM_MODEL=oss-120b`.
Optional reranking can be enabled with `RERANK_BASE_URL`, `RERANK_API_KEY`, `RERANK_MODEL`, and `RERANK_TOP_N`.
For the current prebuilt index, keep embeddings on the same `text-1024` provider used to build FAISS. If you change `EMBED_MODEL` or provider, rebuild dense indexes.

Build its indexes once:

```bash
python scripts/merge_protocol_corpus.py
python scripts/askhat_build_index.py --corpus data/corpus/merged_protocols.jsonl --force
```

Then run:

```bash
chmod +x scripts/run_askhat_rag.sh
./scripts/run_askhat_rag.sh
```

Open `http://127.0.0.1:8080`.

Optional GPT-OSS generation layer:

```bash
export HUB_URL="https://your-openai-compatible-host"
export API_KEY="..."
export MODEL="oss-120b"
```

## Add official protocols

Put the official protocol archive or files into `data/corpus`, then rebuild:

```bash
python -m app.rag.ingest --corpus data/corpus --index data/index.json
```

Expected JSON format from the Qazcode challenge is supported:

```json
{
  "protocol_id": "p_d57148b2d4",
  "source_file": "HELLP-СИНДРОМ.pdf",
  "title": "HELLP-синдром",
  "icd_codes": ["O14.2"],
  "text": "..."
}
```

## Evaluation

The source repo `dair-mus/qazcode-nu` evaluates `POST /diagnose` with body:

```json
{"symptoms": "..."}
```

This project returns diagnoses plus the protocol evidence used by the RAG:

```json
{
  "diagnoses": [{"rank": 1, "diagnosis": "...", "icd10_code": "...", "explanation": "..."}],
  "sources": [{"protocol_id": "...", "title": "...", "section_type": "...", "icd_codes": [], "excerpt": "..."}]
}
```

Ground truth from `data/test_set` must not be used during inference.

Run reproducible checks against a running full server:

```bash
python scripts/evaluate_retrieval.py --limit 20
python scripts/evaluate_golden.py --limit 20 --concurrency 1
python scripts/audit_golden.py
```

Current honest 20-case baseline with `FEW_SHOT_COUNT=0`:

- retrieval code recall: 15/20 (75%), up from 11/20 before adaptation;
- exact Top-1 ICD: 7/20 (35%);
- three-character ICD family Top-1: 16/20 (80%);
- API errors: 0/20; mean full-pipeline latency: 23.2 seconds.

The golden audit flags 4/20 labels for manual review because the expected code
is not present in the source protocol's primary ICD table. Treat exact-code
accuracy as a development metric, not clinical validation.
