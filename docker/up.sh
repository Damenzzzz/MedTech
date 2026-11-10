#!/usr/bin/env bash
# Start the whole local KazMedSim stack: Supabase (CLI) + web + both RAG services.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
BASIC_RAG_DIR="${BASIC_RAG_DIR:-$(cd "$ROOT/.." && pwd)/RAG_medtech}"

[[ -f .env ]] || { cp .env.example .env; echo "Created docker/.env from .env.example"; }
if ! grep -qE '^SESSION_SECRET=.+' .env; then
  S="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
  sed -i '' "s|^SESSION_SECRET=.*|SESSION_SECRET=$S|" .env
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running — starting Docker Desktop..."; open -a Docker
  until docker info >/dev/null 2>&1; do sleep 2; done
fi

# basic-rag lives in the RAG_medtech repo next to MedTech/
if [[ ! -f "$BASIC_RAG_DIR/Dockerfile" ]]; then
  echo "basic-rag not found at $BASIC_RAG_DIR — clone Damenzzzz/RAG_medtech next to MedTech/"; exit 1
fi
[[ -f "$BASIC_RAG_DIR/basic_rag/chroma_db/chroma.sqlite3" ]] || "$BASIC_RAG_DIR/scripts/fetch_assets.sh"

# 1) Local Supabase (Postgres + REST), migrations from supabase/migrations
(cd "$ROOT" && npx -y supabase@latest start >/dev/null)
KEY="$(cd "$ROOT" && npx -y supabase@latest status -o env | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
[[ -n "$KEY" ]] || { echo "Could not read SERVICE_ROLE_KEY from supabase status"; exit 1; }
sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$KEY|" .env

# 2) Warn about missing provider keys (the stack still starts; AI calls will fail)
for k in ALEM_API_KEY GEMINI_API_KEY; do
  grep -qE "^$k=.+" .env || echo "WARNING: $k is empty in docker/.env — AI features will fail"
done

# 3) App containers
export BASIC_RAG_DIR
docker compose build
docker compose up -d gemini-proxy

# 4) First run with Gemini embeddings: re-embed basic-rag's 22,100 chunks once (~10-20 min, resumable).
#    Skipped when BASIC_RAG_CHROMA_DIR points at the original Alem index.
mkdir -p "$BASIC_RAG_DIR/basic_rag/chroma_db_gemini"
if grep -qE '^BASIC_RAG_CHROMA_DIR=/app/basic_rag/chroma_db$' .env; then
  echo "basic-rag: using original Alem text-1024 index"
elif ! docker compose run --rm --no-deps -T basic-rag python -c "
import chromadb,sys
c=chromadb.PersistentClient('basic_rag/chroma_db_gemini')
sys.exit(0 if any(x.name=='kz_protocols' for x in c.list_collections()) and c.get_collection('kz_protocols').count()>=22100 else 1)" 2>/dev/null; then
  echo "basic-rag: building Gemini embedding index (one-time)..."
  docker compose run --rm --no-deps -T basic-rag python scripts/reindex_chroma.py \
    --src basic_rag/chroma_db --dst basic_rag/chroma_db_gemini \
    --base-url http://gemini-proxy:8000/v1 --model gemini-embedding-001:document
fi

docker compose up -d
echo
echo "web         http://localhost:3000"
echo "basic-rag   http://localhost:8080/health"
echo "rag-service http://localhost:8081/health"
echo "supabase    http://localhost:54323 (Studio)"
