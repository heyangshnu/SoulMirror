#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH=.
set -a
[ -f .env ] && source .env
set +a
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}" --reload
