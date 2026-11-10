#!/usr/bin/env bash
# Stop the local stack (Supabase data is kept).
set -euo pipefail
cd "$(dirname "$0")"
docker compose down
(cd .. && npx -y supabase@latest stop)
