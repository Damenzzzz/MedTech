"""OpenAI-compatible /v1/chat/completions -> Vertex AI Gemini (express-mode API key).

Lets the RAG services, which speak the OpenAI chat API, use Gemini without code
changes: point their base URL at http://gemini-proxy:8000/v1.

Env:
  GEMINI_API_KEY        Vertex AI express-mode key (required)
  GEMINI_MODEL          default model when the request asks for a non-Gemini one (gemini-3.6-flash)
  GEMINI_THINKING_LEVEL default thinking level (low)
  VERTEX_BASE_URL       https://aiplatform.googleapis.com/v1/publishers/google/models
"""

from __future__ import annotations

import os
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
