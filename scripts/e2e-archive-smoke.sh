#!/usr/bin/env bash
# Archive E2E smoke — requires running API + agent-host + valid JWT (optional)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Static validation"
bash scripts/validate-archive.sh

API="${SMOKE_API_URL:-http://127.0.0.1:3010/v1}"
AGENT="${SMOKE_AGENT_URL:-http://127.0.0.1:8787}"

echo "==> agent-host health"
curl -sf "${AGENT}/health" | grep -q '"ok":true'

echo "==> API agent health"
curl -sf "${API}/agent/health" || echo "WARN: API not running (skip gateway checks)"

if [ -n "${SMOKE_JWT:-}" ]; then
  echo "==> memory dashboard (JWT)"
  curl -sf -H "Authorization: Bearer ${SMOKE_JWT}" "${API}/memory/dashboard" >/dev/null
  echo "==> current-topic"
  curl -sf -H "Authorization: Bearer ${SMOKE_JWT}" "${API}/memory/current-topic" >/dev/null
fi

echo "✅ Archive E2E smoke (static + health) passed"
