# AI Handoff: MedTech Clinical AI Platform

Last updated: 2026-07-21

This file is for another AI/engineer who needs to understand the project quickly without reading the whole chat history.

## Project Goal

The product is a clinical AI MVP for a hackathon. It has three main ideas:

1. **Clinical RAG assistant**
   - Doctor enters symptoms, anamnesis, exam findings, and labs.
   - RAG searches official Kazakhstan clinical protocols.
   - LLM generates differential diagnoses, supporting findings, missing information, and follow-up questions.

2. **Student simulator**
   - Medical student talks to an AI patient.
   - The patient has hidden context and should answer like a real patient without revealing the diagnosis.
   - Student chooses diagnosis and management plan.
   - AI gives feedback.

3. **Rural urgent advice**
   - Nurse/doctor in rural area asks what to do.
   - Assistant must clearly state that the final decision belongs to the doctor/medical worker.
   - For emergency cases, do not delay care: ABC, vitals, ECG if chest pain, urgent referral/evacuation.

## Production

Frontend production URL:

https://medtech-ai-rag.vercel.app/ru/ai-assistant

Main GitHub repo:

https://github.com/Damenzzzz/MedTech

Current active branch used by Codex:

`codex/gpt55-rag`

Backup branch created before risky demo changes:

`codex/backup-pre-demo-2026-07-20`

## Important Architecture

There are two parts:

1. **Next.js app** in this repository
   - UI for RAG, urgent advice, simulator, STT.
   - API routes proxy to RAG backend and call LLM providers.

2. **Python RAG backend** in local workspace
   - Path on original machine:
     `/Users/nurdauletaldibek/Documents/med_hackaton/askhat_rag`
   - Served locally with Uvicorn on `127.0.0.1:8080`.
   - Exposed to Vercel through Cloudflare Tunnel.

## Key Frontend Files

### UI

`src/components/ai/clinical-ai-workspace.tsx`

Contains the main AI assistant UI:

- RAG tab
- Urgent advice tab
- Simulator tab
- STT tab

Important behavior:

- RAG tab calls `/api/clinical/diagnose/jobs`.
- It expects async job behavior:
  - start job
  - poll job status
  - show completed result

### RAG API Routes

`src/app/api/clinical/diagnose/jobs/route.ts`

Starts a RAG job by proxying to:

`RAG_SERVICE_URL/api/diagnose-jobs`

`src/app/api/clinical/diagnose/jobs/[jobId]/route.ts`

Polls job status from:

`RAG_SERVICE_URL/api/diagnose-jobs/{jobId}`

`src/app/api/clinical/diagnose/route.ts`

Synchronous/legacy diagnose route. It first tries async job internally, then direct RAG, then LLM fallback.

### Urgent Advice

`src/app/api/clinical/advice/route.ts`

Important logic:

- `mode: "chat"` gives fast chat.
- `mode: "action"` does deeper action plan.
- Emergency fast chat has a guard:
  - No medication doses in quick emergency reply.
  - It tells user to do ABC/vitals/ECG/referral and use "Дать действия" for protocol-level plan.

### Simulator

`src/app/api/simulator/respond/route.ts`

LLM plays patient role.

`src/app/api/simulator/evaluate/route.ts`

LLM evaluates student.

### LLM Provider Wrapper

`src/lib/llm.ts`

Current provider order:

1. Gemini primary
2. Alem fallback

Important: The Gemini key was tested and returned `429 RESOURCE_EXHAUSTED`, meaning credits are depleted. Code still tries Gemini first. Until billing/credits are fixed, it falls back to Alem.

### STT

`src/app/api/transcribe/route.ts`

Still uses OpenAI STT. User said not to touch STT until they buy OpenAI credits.

Known current situation:

- OpenAI key quota was exhausted.
- STT endpoint will fail until OpenAI billing/quota is fixed.
- User mentioned possible Hugging Face Whisper API later, but no endpoint/request/response format has been provided yet.

## Environment Variables

Vercel Production currently has:

- `RAG_SERVICE_URL`
- `OPENAI_API_KEY`
- `ALEM_API_KEY`
- `GEMINI_API_KEY`

Expected meanings:

- `RAG_SERVICE_URL`: public tunnel URL to local Python RAG backend.
- `GEMINI_API_KEY`: preferred LLM, but currently depleted.
- `ALEM_API_KEY`: fallback LLM.
- `OPENAI_API_KEY`: currently only needed for STT.

Optional model/env knobs:

- `GEMINI_MODEL`, default `gemini-2.5-flash`
- `GEMINI_BASE_URL`, default `https://generativelanguage.googleapis.com/v1beta`
- `ALEM_CHAT_MODEL`, default `alemllm`
- `ALEM_BASE_URL`, default `https://llm.alem.ai/v1`

## RAG Backend Data

The active RAG corpus is **not** `data/index.json`.

Python backend loads corpus from:

`data/corpus/merged_protocols_structured_dedup.jsonl`

Fallback corpus:

`data/corpus/merged_protocols.jsonl`

The `.jsonl` corpus contains one JSON object per line. Each protocol has fields like:

- `protocol_id`
- `source_file`
- `title`
- `icd_codes`
- `text`

Known issue:

- Some titles are dirty. Example: title may be `"Одобрен"` while `source_file` is `HELLP-СИНДРОМ.pdf`.
- For a custom RAG from scratch, clean title from `source_file` if title is bad.

Search indexes are built from the corpus and stored in:

`data/indexes/`

Important index files:

- `bm25.pkl`
- `faiss.index`
- `chunks.pkl`
- `metadata.json`

Current metadata seen before:

- around 1207 protocols
- around 18115 chunks

## RAG Backend Code

Original local path:

`/Users/nurdauletaldibek/Documents/med_hackaton/askhat_rag`

Important files:

- `server.py`
  - FastAPI server
  - loads protocols
  - starts async diagnose jobs
  - has `/health`
  - has `/api/diagnose-jobs`
  - has `/api/diagnose-jobs/{job_id}`

- `data_loader.py`
  - loads JSONL protocols

- `indexer.py`
  - chunks protocols
  - builds BM25 + FAISS

- `retriever.py`
  - hybrid retrieval logic
  - BM25 + FAISS + ICD lookup + reranking

- `generator.py`
  - final diagnosis generation prompt
  - faithfulness rules
  - asks follow-up questions

- `postprocessor.py`
  - parses/normalizes LLM diagnosis output

## Hard Parts / Things That Broke

### 1. Localtunnel was unstable

Old public tunnel sometimes returned 502 for long RAG calls.

Fix:

- Switched to Cloudflare Tunnel.
- Also changed frontend to use async job polling instead of one long request.

Important: Cloudflare quick tunnel is still not a true production backend. For final product, deploy Python RAG to real hosting:

- Railway
- Render
- Fly.io
- VPS
- Cloud Run

### 2. Bad demo-safe RAG shortcut was added and then reverted

A commit added instant cached/demo RAG fallback for chest pain and preeclampsia so demo would not fail if tunnel died.

Problem:

- It made user feel real RAG was not analyzing.
- It returned instant top diagnoses instead of live retrieval.

Fix:

- Reverted in commit:
  `252c310 Revert "Add presentation-safe RAG guardrails"`

Current behavior:

- `/api/clinical/diagnose/jobs` should start live RAG job and return `job_id` + `running`.
- It should not instantly return cached demo result.

### 3. Alem LLM quality is weaker than GPT

OpenAI quota ran out, so main LLM was moved to Alem, then Gemini was added as primary.

Observed:

- Alem can follow basic role-play.
- Alem is weaker for strict clinical JSON and nuanced medical guardrails.
- Simulator may feel worse than GPT.

Current LLM order:

1. Gemini
2. Alem

But Gemini currently has depleted credits, so Alem is effectively active.

### 4. Gemini key is valid but depleted

Gemini API test returned:

`429 RESOURCE_EXHAUSTED`

Meaning:

- key exists / API responds
- billing or prepaid credits are depleted
- once user refills Gemini credits, code should automatically use Gemini first

### 5. STT is currently not reliable

OpenAI STT requires OpenAI quota.

User said:

- do not touch STT for now
- tomorrow they may buy OpenAI tokens

Potential future option:

- User mentioned Hugging Face model `antony66/whisper-large-v3-russian`.
- It may be good for Russian STT but needs hosted inference/GPU and does not solve speaker diarization by itself.
- Need actual API endpoint and response format before implementing.

### 6. Faithfulness matters

Earlier model hallucinated protocol criteria as patient facts. Example:

- Protocol says proteinuria should be checked.
- Model incorrectly wrote patient has proteinuria.

Important rule:

- Patient facts must only come from input text.
- Protocol criteria not present in patient text should go to:
  - `missing_findings`
  - `recommended_checks`
  - `protocol_criteria`

Not to:

- `supporting_findings`
- `summary`
- `patient_findings`

## Current Git State

Most recent important commits:

- `65e03ec Use Gemini before Alem for LLM calls`
- `252c310 Revert "Add presentation-safe RAG guardrails"`
- `4573062 Guard fast advice emergency replies`
- `87ffefc Use Alem LLM for clinical flows`
- `70e725f Add presentation-safe RAG guardrails` (bad shortcut; reverted)

## How To Start Local Python RAG Backend

From original workspace:

```bash
cd /Users/nurdauletaldibek/Documents/med_hackaton
.venv/bin/uvicorn askhat_rag.server:app --host 127.0.0.1 --port 8080
```

Check:

```bash
curl http://127.0.0.1:8080/health
```

Expected:

```json
{"status":"ok","protocols":1207}
```

## How To Expose RAG Backend

Cloudflare quick tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8080
```

Then set Vercel env:

```bash
vercel env rm RAG_SERVICE_URL production --yes
printf '%s' 'https://YOUR-TUNNEL.trycloudflare.com' | vercel env add RAG_SERVICE_URL production
vercel --prod --yes
```

## How To Verify Live RAG Is Working

Call production:

```bash
curl -s -X POST https://medtech-ai-rag.vercel.app/api/clinical/diagnose/jobs \
  -H 'content-type: application/json' \
  --data '{"symptoms":"Пациент 58 лет, давящая боль за грудиной 40 минут, холодный пот, одышка, иррадиация в левую руку."}'
```

Healthy live behavior:

```json
{
  "job_id": "...",
  "status": "running"
}
```

Then poll:

```bash
curl -s https://medtech-ai-rag.vercel.app/api/clinical/diagnose/jobs/JOB_ID
```

Completed behavior:

```json
{
  "status": "completed",
  "result": {
    "diagnoses": [...],
    "sources": [...]
  }
}
```

## User Is Also Practicing Writing RAG From Scratch

They started manual RAG practice:

1. load JSONL corpus
2. clean title
3. split text
4. embed chunks
5. store in Chroma
6. retrieve

They used ParentDocumentRetriever and Chroma.

Known issue:

`batch_size=50` parent docs produced `6072` child chunks, but Chroma max batch was `5461`.

Advice:

- lower parent batch size to 10 or 20
- use persistent Chroma:

```python
vectorstore = Chroma(
    collection_name="kz_protocols",
    embedding_function=embedding,
    persist_directory="./chroma_db",
)
```

Important:

- `InMemoryStore()` loses parent docs after restart.
- For practice it is okay.
- For reusable RAG use persistent docstore or save parent docs separately.

## Recommended Next Steps

1. Keep live RAG behavior; do not re-add instant cached diagnosis shortcut unless behind a visible toggle.
2. Fix/renew Gemini credits if Gemini should really be primary.
3. Use GPT again for simulator and clinical final generation if OpenAI credits are restored; quality was better.
4. Deploy Python RAG backend to real hosting instead of tunnel.
5. Add proper STT only after API/quota is available.
6. Improve title cleaning and table-aware extraction for custom RAG practice.

