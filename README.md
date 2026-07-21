# KazMedSim (MedTech) — AI Medical Training & Clinical Protocol Simulator

KazMedSim is an advanced medical education and clinical protocol simulation platform. It enables medical students and physicians to practice diagnostic reasoning, conduct synthetic patient encounters, receive automated debriefs, and generate editable clinical protocol drafts.

---

## 🏛️ Provider Architecture & LLM Isolation

| Function | Active Provider | Endpoint / Model | Environment Variable |
|---|---|---|---|
| **Patient Simulation** | **AlemLLM** | `POST https://llm.alem.ai/v1/chat/completions` (`alemllm`) | `LLM_PROVIDER=alem` |
| **Clinical Reasoning & RAG Fallback** | **AlemLLM** | `POST https://llm.alem.ai/v1/chat/completions` (`alemllm`) | `LLM_PROVIDER=alem` |
| **Protocol Draft Generation** | **AlemLLM** | `POST https://llm.alem.ai/v1/chat/completions` (`alemllm`) | `LLM_PROVIDER=alem` |
| **Speech-to-Text (Audio STT)** | **OpenAI STT** | `POST https://api.openai.com/v1/audio/transcriptions` (`gpt-4o-transcribe-diarize`) | `STT_PROVIDER=openai` |

> [!IMPORTANT]
> **Strict Provider Isolation Rules:**
> - **AlemLLM (`alemllm`)** is the SOLE text LLM used for text generation, clinical rationale, patient role-play, and protocol drafting.
> - **OpenAI** is used **ONLY** for audio Speech-to-Text (`POST /v1/audio/transcriptions`).
> - `OPENAI_API_KEY` is **NEVER** read by text LLM adapters or RAG endpoints.
> - OpenAI Chat Completions and Responses APIs are strictly prohibited for text generation.

---

## ⚡ Features

### 1. Patient Simulator & Training Workspace
- 32 synthetic medical cases across 8 specialties (Cardiology, Pulmonology, Endocrinology, Gastroenterology, Neurology, Emergency, Therapy, Infectious).
- Role-play patient dialogue driven by `PatientEngine` with hidden fact unlocking.
- Structured physical examination findings, laboratory & imaging ordering, differential diagnosis, and management planning.
- **Server-Side Option Bank**: Management options include plausible distractors and dangerous actions. DTO contains no correctness markers (`correct`, `dangerous`, `score`).

### 2. Clinical Rationale & RAG Refinement
- Queries Python RAG service or falls back to AlemLLM.
- **Card: «Почему выбран этот вариант»**: Provides mandatory 1-2 sentence `summary`, confidence badge, supporting patient evidence quotes, missing/conflicting criteria, rank rationale, and discriminator tests.
- **Refine Flow**: Refines differential diagnosis without losing previous results on network error.
- **Honest RAG Status**: Distinguishes `rag-ready`, `rag-empty`, `fallback`, and `unavailable`. When no RAG sources exist, displays: *"Ответ сформирован без подтверждённых RAG-источников"*.

### 3. Speech-to-Text (STT) & Editable Protocol Workflow
- Audio recording upload to `/api/transcribe` calling `POST /v1/audio/transcriptions`.
- Supports speaker diarization (`OPENAI_STT_DIARIZATION=true`).
- **AlemLLM Protocol Generation**: Generates structured medical protocol draft (`/api/encounter/protocol`) with SHA-256 caching.
- **Local Physician Edits**: Physician can manually edit protocol sections without making LLM calls. Protocol tracks version history (`v1`, `v2`, status: `draft` -> `edited`).
- **Export**: JSON and print view exports.

### 4. Debrief & Dashboard
- **Fair Debrief Scoring**: Absence of indicated tests reduces score (0 ordered tests = 0 score). Dangerous actions create critical error penalties and set management score to 0.
- **Celebration Banner**: Displays only when `total >= 80 AND missedRedFlags.length === 0 AND criticalErrors.length === 0`.
- **Dashboard**: Calculates real missed red flags from saved progress (`kms-progress`). Dynamically recommends cases based on uncompleted cases and weakest specialty.

---

## 🛡️ Case Catalog & Core/Beta Tiers

- **Total Cases**: 32
- **Core (Verified)**: 0
- **Beta (Unreviewed)**: 32

To maintain medical safety, cases without a signed clinician review audit trail are categorized as `validationTier: "beta"` and `medicalReviewStatus: "unreviewed"`. See `docs/CORE_CASES_REQUIRED.md` for details.

---

## ⚠️ Medical Safety & Privacy Notices

> [!CAUTION]
> **Educational & Synthetic Use Only:**
> - KazMedSim is designed for medical training and educational simulation only.
> - **AI protocol drafts are NOT approved medical records** and MUST be reviewed, validated, and signed by a licensed physician before clinical application.
> - Exact medication dosages in unreviewed cases are accompanied by an educational notice and must be verified by a clinician.
> - **Privacy**: DO NOT upload real, identifiable patient health information (PHI/PII) to the system. All test cases use synthetic data.

---

## 🚀 Development & Testing Setup

### 1. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

For offline testing or CI:
```bash
LLM_PROVIDER=mock
STT_PROVIDER=mock
```

### 2. Run Frontend
```bash
pnpm install
pnpm dev
```

### 3. Run Quality Checks
```bash
pnpm lint        # Run ESLint (0 errors/warnings)
pnpm typecheck   # Run TypeScript compiler
pnpm test        # Run Vitest unit & integration tests
pnpm build       # Run Next.js production build
```

### 4. Run Playwright E2E Tests
```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

### 5. Run Python RAG Service (Optional)
```bash
cd rag_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🔑 Key Rotation & Security Guidelines

- Keep `.env.local` in `.gitignore` to prevent committing API keys.
- **AlemLLM Key Rotation**: Update `ALEM_API_KEY` in `.env.local` (Next.js server side).
- **OpenAI STT Key Rotation**: Update `OPENAI_API_KEY` in `.env.local`.
- **Python RAG Key Rotation**: Update `rag_service/.env`.
