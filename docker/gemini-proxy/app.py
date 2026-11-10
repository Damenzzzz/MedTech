"""OpenAI-compatible /v1/chat/completions and /v1/embeddings -> Vertex AI Gemini (express-mode API key).

Lets the RAG services, which speak the OpenAI chat API, use Gemini without code
changes: point their base URL at http://gemini-proxy:8000/v1.

Env:
  GEMINI_API_KEY        Vertex AI express-mode key (required)
  GEMINI_MODEL          default model when the request asks for a non-Gemini one (gemini-3.6-flash)
  GEMINI_THINKING_LEVEL default thinking level (low)
  VERTEX_BASE_URL       https://aiplatform.googleapis.com/v1/publishers/google/models
"""

from __future__ import annotations

import asyncio
import base64
import math
import os
import struct
import time
import uuid
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request

API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
DEFAULT_THINKING = os.environ.get("GEMINI_THINKING_LEVEL", "low")
BASE_URL = os.environ.get("VERTEX_BASE_URL", "https://aiplatform.googleapis.com/v1/publishers/google/models")
TIMEOUT = float(os.environ.get("GEMINI_TIMEOUT_SECONDS", "180"))
# Gemini spends output tokens on thinking; keep room so short max_tokens don't truncate answers.
MIN_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MIN_OUTPUT_TOKENS", "4096"))

# OpenAI reasoning_effort -> Gemini thinkingLevel
EFFORT_TO_LEVEL = {"none": "minimal", "minimal": "minimal", "low": "low", "medium": "medium", "high": "high"}
FINISH = {"STOP": "stop", "MAX_TOKENS": "length", "SAFETY": "content_filter", "RECITATION": "content_filter"}

app = FastAPI(title="gemini-proxy")
client = httpx.AsyncClient(timeout=TIMEOUT)


def _text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # OpenAI content parts
        return "".join(p.get("text", "") for p in content if isinstance(p, dict))
    return "" if content is None else str(content)


def _to_gemini(req: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    model = req.get("model") or DEFAULT_MODEL
    if not model.startswith("gemini"):
        model = DEFAULT_MODEL

    system_parts, contents = [], []
    for m in req.get("messages", []):
        role, text = m.get("role"), _text(m.get("content"))
        if role in ("system", "developer"):
            system_parts.append({"text": text})
            continue
        g_role = "model" if role == "assistant" else "user"
        if contents and contents[-1]["role"] == g_role:  # Gemini wants alternating turns
            contents[-1]["parts"].append({"text": text})
        else:
            contents.append({"role": g_role, "parts": [{"text": text}]})
    if not contents:
        contents = [{"role": "user", "parts": [{"text": ""}]}]

    requested = req.get("max_completion_tokens") or req.get("max_tokens") or 0
    gen: dict[str, Any] = {
        "maxOutputTokens": max(int(requested), MIN_OUTPUT_TOKENS),
        "thinkingConfig": {"thinkingLevel": EFFORT_TO_LEVEL.get(str(req.get("reasoning_effort", "")).lower(), DEFAULT_THINKING)},
    }
    if req.get("temperature") is not None:
        gen["temperature"] = req["temperature"]
    if req.get("top_p") is not None:
        gen["topP"] = req["top_p"]
    if req.get("stop"):
        gen["stopSequences"] = req["stop"] if isinstance(req["stop"], list) else [req["stop"]]
    rf = (req.get("response_format") or {}).get("type")
    if rf in ("json_object", "json_schema"):
        gen["responseMimeType"] = "application/json"

    body: dict[str, Any] = {"contents": contents, "generationConfig": gen}
    if system_parts:
        body["systemInstruction"] = {"parts": system_parts}
    return model, body


EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.environ.get("GEMINI_EMBED_DIM", "1536"))
EMBED_BATCH = int(os.environ.get("GEMINI_EMBED_BATCH", "16"))
TASKS = {"query": "RETRIEVAL_QUERY", "document": "RETRIEVAL_DOCUMENT", "similarity": "SEMANTIC_SIMILARITY"}
_tokenizer = None


def _decode_tokens(tokens: list[int]) -> str:
    # LangChain's OpenAIEmbeddings sends tiktoken ids for long-context checks.
    global _tokenizer
    if _tokenizer is None:
        import tiktoken
        _tokenizer = tiktoken.get_encoding("cl100k_base")
    return _tokenizer.decode(tokens)


def _inputs(raw: Any) -> list[str]:
    if isinstance(raw, str):
        return [raw]
    if raw and isinstance(raw, list) and isinstance(raw[0], int):
        return [_decode_tokens(raw)]
    return [x if isinstance(x, str) else _decode_tokens(x) for x in raw or []]


async def _embed_batch(model: str, task: str | None, texts: list[str], dim: int) -> list[list[float]]:
    instances = [{"content": t or " ", **({"task_type": task} if task else {})} for t in texts]
    for attempt in range(6):
        r = await client.post(f"{BASE_URL}/{model}:predict", params={"key": API_KEY},
                              json={"instances": instances, "parameters": {"outputDimensionality": dim, "autoTruncate": True}})
        if r.status_code == 429 or r.status_code >= 500:
            await asyncio.sleep(2 ** attempt)
            continue
        if r.status_code != 200:
            raise HTTPException(r.status_code, r.text[:500])
        return [p["embeddings"]["values"] for p in r.json()["predictions"]]
    raise HTTPException(429, "Vertex embeddings rate-limited, retries exhausted")


@app.post("/v1/embeddings")
async def embeddings(request: Request) -> dict[str, Any]:
    """OpenAI /v1/embeddings -> Vertex predict. Model may carry a task suffix:
    `gemini-embedding-001:document` (indexing) / `:query` (search). Vectors are L2-normalised."""
    if not API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY is not configured")
    req = await request.json()
    name, _, task_key = (req.get("model") or EMBED_MODEL).partition(":")
    model = name if name.startswith(("gemini-embedding", "text-embedding", "text-multilingual-embedding")) else EMBED_MODEL
    task = TASKS.get(task_key)
    dim = int(req.get("dimensions") or EMBED_DIM)
    texts = _inputs(req.get("input"))

    batches = [texts[i:i + EMBED_BATCH] for i in range(0, len(texts), EMBED_BATCH)]
    results = await asyncio.gather(*(_embed_batch(model, task, b, dim) for b in batches))
    vectors = [v for batch in results for v in batch]

    b64 = req.get("encoding_format") == "base64"
    data = []
    for i, v in enumerate(vectors):
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        v = [x / n for x in v]
        emb: Any = base64.b64encode(struct.pack(f"<{len(v)}f", *v)).decode() if b64 else v
        data.append({"object": "embedding", "index": i, "embedding": emb})
    tokens = sum(len(t) for t in texts) // 4
    return {"object": "list", "model": model, "data": data, "usage": {"prompt_tokens": tokens, "total_tokens": tokens}}


@app.post("/v1/rerank")
async def rerank(request: Request) -> dict[str, Any]:
    """Cohere/Alem-style rerank ({query, documents, top_n} -> results[{index, relevance_score}]),
    scored by cosine similarity of Gemini retrieval embeddings (query vs document task types)."""
    if not API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY is not configured")
    req = await request.json()
    docs = [d if isinstance(d, str) else d.get("text", "") for d in req.get("documents", [])]
    if not docs:
        return {"results": []}
    batches = [docs[i:i + EMBED_BATCH] for i in range(0, len(docs), EMBED_BATCH)]
    q_vec, *doc_batches = await asyncio.gather(
        _embed_batch(EMBED_MODEL, TASKS["query"], [req.get("query", "")], EMBED_DIM),
        *(_embed_batch(EMBED_MODEL, TASKS["document"], b, EMBED_DIM) for b in batches),
    )
    q = q_vec[0]
    qn = math.sqrt(sum(x * x for x in q)) or 1.0
    scores = []
    for i, v in enumerate(v for batch in doc_batches for v in batch):
        vn = math.sqrt(sum(x * x for x in v)) or 1.0
        scores.append((i, sum(a * b for a, b in zip(q, v)) / (qn * vn)))
    scores.sort(key=lambda t: t[1], reverse=True)
    top_n = int(req.get("top_n") or len(scores))
    return {"model": EMBED_MODEL, "results": [{"index": i, "relevance_score": round(s, 6)} for i, s in scores[:top_n]]}


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "model": DEFAULT_MODEL, "key_configured": bool(API_KEY)}


@app.get("/v1/models")
async def models() -> dict[str, Any]:
    return {"object": "list", "data": [{"id": DEFAULT_MODEL, "object": "model", "owned_by": "google"}]}


@app.post("/v1/chat/completions")
async def chat_completions(request: Request) -> dict[str, Any]:
    if not API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY is not configured")
    req = await request.json()
    if req.get("stream"):
        raise HTTPException(400, "stream=true is not supported by gemini-proxy")
    model, body = _to_gemini(req)

    r = await client.post(f"{BASE_URL}/{model}:generateContent", params={"key": API_KEY}, json=body)
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("error", {}).get("message", r.text) if r.headers.get("content-type", "").startswith("application/json") else r.text)
    data = r.json()

    cand = (data.get("candidates") or [{}])[0]
    parts = cand.get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    usage = data.get("usageMetadata", {})
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": data.get("modelVersion", model),
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": FINISH.get(cand.get("finishReason", "STOP"), "stop"),
        }],
        "usage": {
            "prompt_tokens": usage.get("promptTokenCount", 0),
            "completion_tokens": usage.get("candidatesTokenCount", 0) + usage.get("thoughtsTokenCount", 0),
            "total_tokens": usage.get("totalTokenCount", 0),
        },
    }
