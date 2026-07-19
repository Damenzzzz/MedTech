#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-8080}"

run_local_rag() {
  echo "Alem configuration is not ready; starting the local protocol RAG on port $PORT."
  exec .venv/bin/uvicorn app.api.server:app --host 127.0.0.1 --port "$PORT"
}

if [[ ! -f .env ]]; then
  run_local_rag
fi

set -a
source .env
set +a
export KMP_DUPLICATE_LIB_OK="${KMP_DUPLICATE_LIB_OK:-TRUE}"

: "${CORPUS_PATH:=data/corpus/merged_protocols_structured_dedup.jsonl}"

LLM_PROVIDER="${LLM_PROVIDER:-custom}"
EMBED_PROVIDER="${EMBED_PROVIDER:-custom}"

if [[ -z "${LLM_BASE_URL:-${GPT_OSS_BASE_URL:-${HUB_URL:-}}}" ]] \
  || [[ -z "${LLM_API_KEY:-${GPT_OSS_API_KEY:-${API_KEY:-}}}" ]]; then
  run_local_rag
fi

if [[ "$EMBED_PROVIDER" != "local" \
  && "$EMBED_PROVIDER" != "llama-cpp" \
  && "$EMBED_PROVIDER" != "ollama" \
  && -z "${EMBED_API_KEY:-}" ]]; then
  run_local_rag
fi

if [[ ! -f "$CORPUS_PATH" ]]; then
  echo "Merged corpus not found, building it..."
  .venv/bin/python scripts/merge_protocol_corpus.py --output "$CORPUS_PATH"
fi

if [[ ! -f data/indexes/faiss.index || ! -f data/indexes/bm25.pkl || ! -f data/indexes/chunks.pkl ]]; then
  echo "Askhat RAG indexes not found, building them..."
  .venv/bin/python scripts/askhat_build_index.py --corpus "$CORPUS_PATH" --force --skip-dense
  .venv/bin/python scripts/askhat_build_dense.py --indexes data/indexes --corpus "$CORPUS_PATH"
fi

exec .venv/bin/uvicorn askhat_rag.server:app --host 127.0.0.1 --port "$PORT"
