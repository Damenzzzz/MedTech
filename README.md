# KazMedSim / MedTech AI

Educational medical AI platform for Kazakhstan hackathon demo. The MVP combines:

- a student clinical simulator with synthetic patients;
- an AI clinical assistant backed by RAG over Kazakhstan clinical protocols;
- speech-to-text endpoint for doctor/patient conversations;
- Vercel-hosted Next.js frontend with a separate Python RAG service.

The product is for education and physician decision support only. It is not a replacement for a licensed clinician, official protocol review, emergency care, or local clinical governance.

## Live Demo

Production frontend:

```text
https://medtech-ai-rag.vercel.app
```

Useful routes:

- `/ru/ai-assistant` - RAG clinical assistant, clarification flow, student simulator, speech-to-text upload.
- `/ru/patients` - synthetic patient catalogue.
- `/ru/training/gerd` - example training case with case-specific investigations and differential choices.

Important: Vercel hosts the Next.js app. The full RAG engine is a Python/FastAPI backend and must be running separately. In the current demo, `RAG_SERVICE_URL` can point to a tunnel or deployed backend.

## What Works

- **Clinical RAG assistant**
  - proxies from Next.js API routes to the Python RAG backend when `RAG_SERVICE_URL` is configured;
  - falls back to GPT-5.5 clinical JSON generation when no backend is available;
  - returns ranked diagnoses, supporting findings, missing information, recommendations, protocol criteria, and sources;
  - includes faithfulness rules so protocol criteria are not shown as patient facts unless present in the input.

- **Clarification flow**
  - first request runs retrieval;
  - follow-up answers can refine the same differential without a new heavy retrieval;
  - weak or irrelevant clarification should not erase the existing differential list.

- **Student simulator**
  - multiple synthetic cases with easy/medium/hard progression;
  - LLM patient role-play based on hidden case context;
  - student can ask custom questions;
  - diagnosis and management assessment endpoint returns feedback.

- **Training workspace**
  - synthetic patients in `/training/[caseId]`;
  - case-specific investigations instead of one generic list for all cases;
  - broader differential lists plus custom diagnosis entry;
  - management options plus free-text plan.

- **Speech-to-text**
  - browser uploads audio to `/api/transcribe`;
  - backend calls OpenAI transcription model;
  - diarized output is supported when the configured model/provider returns it.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zod contracts
- Zustand session store
- Playwright e2e tests
- Python/FastAPI RAG service
- Hybrid BM25 + FAISS retrieval in `rag_service`
- OpenAI GPT-5.5 for clinical generation/simulator by default
- Alem-compatible embeddings/rerank support for the existing index

## Repository Structure

```text
src/app/                         Next.js pages and route handlers
src/app/api/clinical/*           Clinical diagnose/refine proxy/fallback APIs
src/app/api/simulator/*          LLM patient simulator and evaluation APIs
src/app/api/transcribe           Speech-to-text API
src/components/ai                AI assistant and simulator UX
src/components/training          Classic training workspace
src/data/cases.server.ts         Synthetic patient cases
src/domain/schemas.ts            Zod schemas and DTO contracts
src/engines                      Patient response engine contracts
src/repositories                 Case repository abstraction
rag_service                      Python RAG backend
tests/e2e                        Playwright checks
```

## Environment Variables

Frontend / Vercel:

```bash
OPENAI_API_KEY=...
OPENAI_CLINICAL_MODEL=gpt-5.5
OPENAI_SIM_MODEL=gpt-5.5
OPENAI_STT_MODEL=gpt-4o-transcribe-diarize
RAG_SERVICE_URL=https://your-rag-backend.example.com
CASE_REPOSITORY=seed
```

`RAG_SERVICE_URL` is optional for local UI work, but required for the full protocol RAG path. Without it, `/api/clinical/diagnose` uses the GPT fallback and will not cite the full protocol corpus.

RAG backend variables are documented in [rag_service/.env.example](./rag_service/.env.example).

Do not commit real API keys. Rotate any key that was shared in chat or screenshots.

## Local Frontend Setup

Requirements:

- Node.js 20.9+
- pnpm 10+

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000/ru
```

If pnpm supply-chain policy blocks very fresh packages locally, you can run with already-installed dependencies:

```bash
./node_modules/.bin/next dev -p 3000
```

## Local RAG Backend Setup

The stronger medical RAG service lives in `rag_service/`. It adapts the Askhat hackathon RAG pipeline and uses merged protocol corpora/indexes.

```bash
cd rag_service
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

Fill `.env`, then build or reuse indexes:

```bash
python scripts/merge_protocol_corpus.py
python scripts/askhat_build_index.py --corpus data/corpus/merged_protocols_structured_dedup.jsonl --force
```

Run:

```bash
chmod +x scripts/run_askhat_rag.sh
./scripts/run_askhat_rag.sh
```

Open:

```text
http://127.0.0.1:8080
```

Point the Next.js app to it:

```bash
RAG_SERVICE_URL=http://127.0.0.1:8080 pnpm dev
```

Large PDF files, FAISS/BM25 indexes, generated corpus JSONL files, and local `.env` files should stay out of git.

## RAG Endpoints

Python backend:

- `GET /health` - readiness check.
- `POST /diagnose` - full diagnosis generation.
- `POST /api/retrieve` - retrieval diagnostics.
- `POST /refine` - refine existing candidates with clarification answers.

Next.js proxy/fallback:

- `POST /api/clinical/diagnose`
- `POST /api/clinical/refine`

Expected diagnose body:

```json
{
  "symptoms": "Пациент: боль в груди, одышка, холодный пот..."
}
```

## Data Extraction

Official Kazakhstan protocols can be extracted and merged through scripts in `rag_service/scripts/`:

- `extract_nrchd_structured.py` - structured extraction from NRCHD protocol files.
- `merge_protocol_corpus.py` - merges Qazcode/official protocol sources into one JSONL corpus.
- `askhat_build_index.py` - builds retrieval indexes.
- `askhat_build_dense.py` - builds dense FAISS embeddings.

For protocols with tables, prefer structured extraction/OCR-aware parsing before chunking. Tables should be preserved as markdown-like text or structured rows so dosage, criteria, and classification tables are not flattened into unreadable paragraphs.

## Evaluation

RAG checks:

```bash
cd rag_service
python scripts/evaluate_retrieval.py --limit 20
python scripts/evaluate_golden.py --limit 20 --concurrency 1
python scripts/audit_golden.py
```

Frontend checks:

```bash
pnpm typecheck
pnpm build
./node_modules/.bin/playwright test tests/e2e/critical-flow.spec.ts
```

The e2e suite currently verifies:

- patient list opens and the public API does not leak hidden ground truth;
- the training conversation input keeps focus while typing.

## Deployment

Frontend:

```bash
vercel --prod --yes
```

Required production env for full demo:

```bash
OPENAI_API_KEY=...
RAG_SERVICE_URL=https://your-deployed-rag-backend.example.com
```

Backend:

- deploy `rag_service/` as a Docker/FastAPI service;
- mount or bake the generated corpus/index files;
- expose `/health`, `/diagnose`, `/refine`, and `/api/retrieve`;
- set `RAG_SERVICE_URL` in Vercel to that backend URL.

For hackathon demo, a local tunnel can work temporarily, but it depends on the laptop and tunnel staying online.

## Current Limitations

- Medical content is still demo-grade and must be reviewed by clinicians.
- Synthetic cases are useful for UX demonstration, not certified curriculum content.
- The production frontend is stable, but full RAG quality depends on the separately hosted Python backend and its indexes.
- Speech diarization quality depends on the selected OpenAI transcription model and audio quality.
- Evaluation metrics are development metrics, not clinical validation.

## Safety

Never enter real patient-identifiable data into the demo unless the deployment, storage, consent, and compliance process have been formally approved. The intended workflow is physician support and student training, with the clinician keeping final responsibility.
