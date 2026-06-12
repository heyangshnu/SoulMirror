#!/bin/bash
cd "$(dirname "$0")"
if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi
export PYTHONPATH=.
set -a
[ -f .env ] && source .env
set +a
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}" --reload
